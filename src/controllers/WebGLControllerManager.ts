import { mat3 } from "gl-matrix";

import { IPointsData } from "../data/points";
import { IShapesData } from "../data/shapes";
import { ITableData } from "../data/table";
import { TypedArray } from "../data/types";
import { ILayerConfigModel } from "../models/base";
import { ILayerModel } from "../models/layer";
import { IPointsLayerConfigModel, IPointsModel } from "../models/points";
import { IShapesModel } from "../models/shapes";
import {
  Color,
  Marker,
  TableGroupsColumn,
  TableValuesColumn,
  isTableGroupsColumn,
  isTableValuesColumn,
} from "../models/types";
import ColorUtils from "../utils/ColorUtils";
import HashUtils from "../utils/HashUtils";
import WebGLUtils from "../utils/WebGLUtils";
import pointsFragmentShaderSource from "./shaders/points.frag?raw";
import pointsVertexShaderSource from "./shaders/points.vert?raw";

export default class WebGLControllerManager {
  private readonly _canvas: HTMLCanvasElement;
  private _controller: WebGLController;

  constructor(parent: HTMLElement) {
    this._canvas = WebGLControllerManager._createCanvas(parent);
    this._controller = new WebGLController(this._canvas);
    this._canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault(); // allow context to be restored
    });
    this._canvas.addEventListener("webglcontextrestored", () => {
      this._controller = new WebGLController(this._canvas);
    });
  }

  getController(): WebGLController {
    return this._controller;
  }

  destroy(): void {
    this._controller.destroy();
  }

  private static _createCanvas(parent: HTMLElement): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.style = // TODO double-check whether pointer-events and z-index are needed
      "position: relative; pointer-events: none; z-index: 12; width: 100%; height: 100%;";
    // Place marker canvas under the parent (OpenSeadragon) canvas to enable
    // proper compositing with the minimap and other OpenSeadragon elements.
    parent.appendChild(canvas);
    return canvas;
  }
}

class WebGLController {
  private static readonly _DEFAULT_POINT_SIZES: number[] = [1.0];
  private static readonly _DEFAULT_POINT_COLORS: Color[] = [
    { r: 0, g: 0, b: 0 },
  ]; // TODO
  private static readonly _DEFAULT_POINT_VISIBILITIES: boolean[] = [true];
  private static readonly _DEFAULT_POINT_OPACITIES: number[] = [1.0];
  private static readonly _DEFAULT_POINT_MARKERS: Marker[] = [
    Marker.Disc,
    Marker.Cross,
    Marker.Diamond,
    Marker.Square,
    Marker.TriangleUp,
    Marker.Star,
    Marker.Clobber,
    Marker.HBar,
    Marker.VBar,
    Marker.TailedArrow,
    Marker.TriangleDown,
    Marker.Ring,
    Marker.X,
    Marker.Arrow,
    Marker.Gaussian,
  ];
  private static readonly _POINTS_ATTRIB_LOCATIONS = {
    X: 0,
    Y: 1,
    SIZE: 2,
    COLOR: 3,
    VISIBILITY: 4,
    OPACITY: 5,
    MARKER_INDEX: 6,
    TRANSFORM_INDEX: 7,
  };

  private readonly _gl: WebGL2RenderingContext;
  private readonly _pointsProgram: WebGLProgram;
  private readonly _pointsUniformLocations: {
    transformsUBO: GLuint;
    viewTransform: WebGLUniformLocation;
    markerAtlas: WebGLUniformLocation;
  };
  private readonly _pointsBuffers: {
    x: WebGLBuffer;
    y: WebGLBuffer;
    size: WebGLBuffer;
    color: WebGLBuffer;
    visibility: WebGLBuffer;
    opacity: WebGLBuffer;
    markerIndex: WebGLBuffer;
    transformIndex: WebGLBuffer;
  };
  private readonly _pointsVAO: WebGLVertexArrayObject;
  private _pbsInfos: PointsBufferSliceInfo[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this._gl = WebGLUtils.init(canvas, {
      antialias: false,
      preserveDrawingBuffer: true,
    });
    this._pointsProgram = WebGLUtils.loadProgram(
      this._gl,
      pointsVertexShaderSource,
      pointsFragmentShaderSource,
    );
    this._pointsUniformLocations = {
      transformsUBO: this._gl.getUniformBlockIndex(
        this._pointsProgram,
        "TransformsUBO",
      ),
      viewTransform:
        this._gl.getUniformLocation(this._pointsProgram, "u_viewTransform") ||
        (() => {
          throw new Error("Failed to get uniform location for u_viewTransform");
        })(),
      markerAtlas:
        this._gl.getUniformLocation(this._pointsProgram, "u_markerAtlas") ||
        (() => {
          throw new Error("Failed to get uniform location for u_markerAtlas");
        })(),
    };
    this._pointsBuffers = {
      x: this._gl.createBuffer(),
      y: this._gl.createBuffer(),
      size: this._gl.createBuffer(),
      color: this._gl.createBuffer(),
      visibility: this._gl.createBuffer(),
      opacity: this._gl.createBuffer(),
      markerIndex: this._gl.createBuffer(),
      transformIndex: this._gl.createBuffer(),
    };
    this._pointsVAO = this._createPointsVAO();
  }

  async synchronizePoints(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    sizeMaps: Map<string, Map<string, number>>,
    colorMaps: Map<string, Map<string, Color>>,
    visibilityMaps: Map<string, Map<string, boolean>>,
    opacityMaps: Map<string, Map<string, number>>,
    markerMaps: Map<string, Map<string, Marker>>,
    loadPoints: (points: IPointsModel) => Promise<IPointsData>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<boolean> {
    const pointsInfos = await this._collectPoints(
      layerMap,
      pointsMap,
      loadPoints,
      checkAbort,
    );
    if (pointsInfos === null || checkAbort()) {
      return false;
    }
    let pointsBuffersResized = false;
    const n = pointsInfos.reduce((s, x) => s + x.xs.length, 0);
    if (this._pbsInfos.reduce((s, x) => s + x.length, 0) !== n) {
      this._resizePointsBuffers(n);
      pointsBuffersResized = true;
    }
    const newPBSInfos = await this._loadPoints(
      pointsInfos,
      sizeMaps,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      markerMaps,
      pointsBuffersResized,
      loadTableByID,
      checkAbort,
    );
    if (newPBSInfos === null || checkAbort()) {
      return false;
    }
    this._pbsInfos = newPBSInfos;
    this._drawPoints(n);
    return true;
  }

  async synchronizeShapes(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _layerMap: Map<string, ILayerModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _shapesMap: Map<string, IShapesModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadShapes: (shapes: IShapesModel) => Promise<IShapesData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadTableByID: (tableId: string) => Promise<ITableData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _checkAbort: () => boolean,
  ): Promise<boolean> {
    // TODO
    return await Promise.resolve(true);
  }

  destroy(): void {
    this._gl.deleteProgram(this._pointsProgram);
    for (const pointsBuffer of Object.values(this._pointsBuffers)) {
      this._gl.deleteBuffer(pointsBuffer);
    }
  }

  private async _collectPoints(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    loadPoints: (points: IPointsModel) => Promise<IPointsData>,
    checkAbort: () => boolean,
  ): Promise<PointsInfo[] | null> {
    const pointsInfos: PointsInfo[] = [];
    for (const layer of layerMap.values()) {
      for (const points of pointsMap.values()) {
        for (const layerConfig of points.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId === layer.id,
        )) {
          let data = null;
          try {
            data = await loadPoints(points);
          } catch (error) {
            console.error(`Failed to load points with ID ${points.id}`, error);
          }
          if (checkAbort()) {
            return null;
          }
          if (data !== null) {
            const [xs, ys] = await data.loadPositions(
              layerConfig.pointXDimension,
              layerConfig.pointYDimension,
            );
            if (checkAbort()) {
              return null;
            }
            pointsInfos.push({
              layer: layer,
              points: points,
              layerConfig: layerConfig,
              data: data,
              xs: xs,
              ys: ys,
            });
          }
        }
      }
    }
    return pointsInfos;
  }

  private _resizePointsBuffers(n: number): void {
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.x,
      n * Float32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.y,
      n * Float32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.size,
      n * Float16Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.color,
      n * Uint32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.visibility,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.opacity,
      n * Float16Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.markerIndex,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._pointsBuffers.transformIndex,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
  }

  private async _loadPoints(
    pointsInfos: PointsInfo[],
    sizeMaps: Map<string, Map<string, number>>,
    colorMaps: Map<string, Map<string, Color>>,
    visibilityMaps: Map<string, Map<string, boolean>>,
    opacityMaps: Map<string, Map<string, number>>,
    markerMaps: Map<string, Map<string, Marker>>,
    pointsBuffersResized: boolean,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<PointsBufferSliceInfo[] | null> {
    let i = 0;
    let offset = 0;
    const newPBSInfos: PointsBufferSliceInfo[] = [];
    for (const pointsInfo of pointsInfos) {
      const length = pointsInfo.xs.length;
      const currentPBSInfo = this._pbsInfos[i];
      const pointsBufferSliceChanged =
        pointsBuffersResized ||
        currentPBSInfo === undefined ||
        currentPBSInfo.offset !== offset ||
        currentPBSInfo.length !== length ||
        currentPBSInfo.length !== pointsInfo.ys.length ||
        currentPBSInfo.pointsInfo.layer !== pointsInfo.layer ||
        currentPBSInfo.pointsInfo.points !== pointsInfo.points ||
        currentPBSInfo.pointsInfo.layerConfig !== pointsInfo.layerConfig ||
        currentPBSInfo.pointsInfo.data !== pointsInfo.data;
      // xs
      if (
        pointsBufferSliceChanged ||
        currentPBSInfo.pointsConfig.pointXDimension !==
          pointsInfo.layerConfig.pointXDimension
      ) {
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.x,
          pointsInfo.xs,
          offset,
        );
      }
      // ys
      if (
        pointsBufferSliceChanged ||
        currentPBSInfo.pointsConfig.pointYDimension !==
          pointsInfo.layerConfig.pointYDimension
      ) {
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.y,
          pointsInfo.ys,
          offset,
        );
      }
      // sizes
      if (
        pointsBufferSliceChanged ||
        currentPBSInfo.pointsConfig.pointSize !== pointsInfo.points.pointSize ||
        currentPBSInfo.pointsConfig.sizeMap !== pointsInfo.points.sizeMap
      ) {
        const sizeData = new Float16Array(length);
        let sizeMap = undefined;
        if (pointsInfo.points.sizeMap !== undefined) {
          if (typeof pointsInfo.points.sizeMap === "string") {
            sizeMap = sizeMaps.get(pointsInfo.points.sizeMap);
          } else {
            sizeMap = new Map(Object.entries(pointsInfo.points.sizeMap));
          }
        }
        const success = await this._loadMappableField<number>(
          pointsInfo.points.pointSize,
          sizeData,
          sizeMap,
          WebGLController._DEFAULT_POINT_SIZES,
          loadTableByID,
          checkAbort,
        );
        if (!success) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.size,
          sizeData,
          offset,
        );
      }
      // colors
      if (
        pointsBufferSliceChanged ||
        currentPBSInfo.pointsConfig.pointColor !==
          pointsInfo.points.pointColor ||
        currentPBSInfo.pointsConfig.colorMap !== pointsInfo.points.colorMap
      ) {
        const colorData = new Uint32Array(length);
        let colorMap = undefined;
        if (pointsInfo.points.colorMap !== undefined) {
          if (typeof pointsInfo.points.colorMap === "string") {
            colorMap = colorMaps.get(pointsInfo.points.colorMap);
          } else {
            colorMap = new Map(Object.entries(pointsInfo.points.colorMap));
          }
        }
        const success = await this._loadMappableField<Color, string>(
          pointsInfo.points.pointColor,
          colorData,
          colorMap,
          WebGLController._DEFAULT_POINT_COLORS,
          loadTableByID,
          checkAbort,
          (color) => (color.r << 16) | (color.g << 8) | color.b,
          (colorStr) => ColorUtils.parseHex(colorStr),
        );
        if (!success) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.color,
          colorData,
          offset,
        );
      }
      // visibilities
      if (
        pointsBufferSliceChanged ||
        currentPBSInfo.pointsConfig.layerVisibility !==
          pointsInfo.layer.visibility ||
        currentPBSInfo.pointsConfig.pointsVisibility !==
          pointsInfo.points.visibility ||
        currentPBSInfo.pointsConfig.pointVisibility !==
          pointsInfo.points.pointVisibility ||
        currentPBSInfo.pointsConfig.visibilityMap !==
          pointsInfo.points.visibilityMap
      ) {
        const visibilityData = new Uint8Array(length);
        if (
          pointsInfo.layer.visibility === false ||
          pointsInfo.points.visibility === false
        ) {
          visibilityData.fill(0);
        } else {
          let visibilityMap = undefined;
          if (pointsInfo.points.visibilityMap !== undefined) {
            if (typeof pointsInfo.points.visibilityMap === "string") {
              visibilityMap = visibilityMaps.get(
                pointsInfo.points.visibilityMap,
              );
            } else {
              visibilityMap = new Map(
                Object.entries(pointsInfo.points.visibilityMap),
              );
            }
          }
          const success = await this._loadMappableField<boolean>(
            pointsInfo.points.pointVisibility,
            visibilityData,
            visibilityMap,
            WebGLController._DEFAULT_POINT_VISIBILITIES,
            loadTableByID,
            checkAbort,
            (pointVisibility) => (pointVisibility ? 1 : 0),
          );
          if (!success) {
            return null;
          }
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.visibility,
          visibilityData,
          offset,
        );
      }
      // opacities
      if (
        pointsBufferSliceChanged ||
        currentPBSInfo.pointsConfig.layerOpacity !== pointsInfo.layer.opacity ||
        currentPBSInfo.pointsConfig.pointsOpacity !==
          pointsInfo.points.opacity ||
        currentPBSInfo.pointsConfig.pointOpacity !==
          pointsInfo.points.pointOpacity ||
        currentPBSInfo.pointsConfig.opacityMap !== pointsInfo.points.opacityMap
      ) {
        const opacityData = new Float16Array(length);
        let opacityMap = undefined;
        if (pointsInfo.points.opacityMap !== undefined) {
          if (typeof pointsInfo.points.opacityMap === "string") {
            opacityMap = opacityMaps.get(pointsInfo.points.opacityMap);
          } else {
            opacityMap = new Map(Object.entries(pointsInfo.points.opacityMap));
          }
        }
        const success = await this._loadMappableField<number>(
          pointsInfo.points.pointOpacity,
          opacityData,
          opacityMap,
          WebGLController._DEFAULT_POINT_OPACITIES,
          loadTableByID,
          checkAbort,
          (pointOpacity) =>
            (pointsInfo.layer.opacity ?? 1.0) *
            (pointsInfo.points.opacity ?? 1.0) *
            pointOpacity,
        );
        if (!success) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.opacity,
          opacityData,
          offset,
        );
      }
      // marker indices
      if (
        pointsBufferSliceChanged ||
        currentPBSInfo.pointsConfig.pointMarker !==
          pointsInfo.points.pointMarker ||
        currentPBSInfo.pointsConfig.markerMap !== pointsInfo.points.markerMap
      ) {
        const markerIndexData = new Uint8Array(length);
        let markerMap = undefined;
        if (pointsInfo.points.markerMap !== undefined) {
          if (typeof pointsInfo.points.markerMap === "string") {
            markerMap = markerMaps.get(pointsInfo.points.markerMap);
          } else {
            markerMap = new Map(Object.entries(pointsInfo.points.markerMap));
          }
        }
        const success = await this._loadMappableField<Marker, number>(
          pointsInfo.points.pointMarker,
          markerIndexData,
          markerMap,
          WebGLController._DEFAULT_POINT_MARKERS,
          loadTableByID,
          checkAbort,
        );
        if (!success) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.markerIndex,
          markerIndexData,
          offset,
        );
      }
      // transform indices
      if (pointsBufferSliceChanged) {
        const transformIndices = new Uint8Array(length).fill(i);
        WebGLUtils.loadBufferData(
          this._gl,
          this._pointsBuffers.transformIndex,
          transformIndices,
          offset,
        );
      }
      newPBSInfos.push({
        offset: offset,
        length: length,
        pointsInfo: pointsInfo,
        pointsConfig: {
          layerVisibility: pointsInfo.layer.visibility,
          layerOpacity: pointsInfo.layer.opacity,
          pointsVisibility: pointsInfo.points.visibility,
          pointsOpacity: pointsInfo.points.opacity,
          pointXDimension: pointsInfo.layerConfig.pointXDimension,
          pointYDimension: pointsInfo.layerConfig.pointYDimension,
          pointSize: pointsInfo.points.pointSize,
          sizeMap: pointsInfo.points.sizeMap,
          pointColor: pointsInfo.points.pointColor,
          colorMap: pointsInfo.points.colorMap,
          pointVisibility: pointsInfo.points.pointVisibility,
          visibilityMap: pointsInfo.points.visibilityMap,
          pointOpacity: pointsInfo.points.pointOpacity,
          opacityMap: pointsInfo.points.opacityMap,
          pointMarker: pointsInfo.points.pointMarker,
          markerMap: pointsInfo.points.markerMap,
        },
      });
      offset += length;
      i++;
    }
    return newPBSInfos;
  }

  async _loadMappableField<T, TTableValue = T>(
    field: T | TableValuesColumn | TableGroupsColumn | undefined,
    data: TypedArray,
    mapping: Map<string, T> | undefined,
    defaultValues: T[],
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
    toBufferValue: (value: T) => number = (value) => value as unknown as number,
    parseTableValue: (tableValue: TTableValue) => T = (tableValue) =>
      tableValue as unknown as T,
  ): Promise<boolean> {
    if (field === undefined) {
      data.fill(toBufferValue(defaultValues[0]!));
      return true;
    }
    if (isTableValuesColumn(field)) {
      const tableData = await loadTableByID(field.tableId);
      if (checkAbort()) {
        return false;
      }
      const tableValues = await tableData.loadColumn<TTableValue>(
        field.valuesCol,
      );
      if (checkAbort()) {
        return false;
      }
      data.set(
        tableValues.map((tableValue) =>
          toBufferValue(parseTableValue(tableValue)),
        ),
      );
      return true;
    }
    if (isTableGroupsColumn(field)) {
      const tableData = await loadTableByID(field.tableId);
      if (checkAbort()) {
        return false;
      }
      const tableGroupsRaw = await tableData.loadColumn(field.groupsCol);
      if (checkAbort()) {
        return false;
      }
      const tableGroups = tableGroupsRaw.map((tableGroup) =>
        JSON.stringify(tableGroup),
      );
      if (mapping !== undefined) {
        data.set(
          tableGroups.map((tableGroup) =>
            toBufferValue(mapping.get(tableGroup) || defaultValues[0]!),
          ),
        );
      } else {
        data.set(
          tableGroups.map((tableGroup) =>
            toBufferValue(
              defaultValues[HashUtils.djb2(tableGroup) % defaultValues.length]!,
            ),
          ),
        );
      }
      return true;
    }
    data.fill(toBufferValue(field as T));
    return true;
  }

  _drawPoints(n: number): void {
    // TODO blending
    this._gl.useProgram(this._pointsProgram);
    this._gl.bindVertexArray(this._pointsVAO);
    this._gl.uniformBlockBinding(
      this._pointsProgram,
      this._pointsUniformLocations.transformsUBO,
      0,
    );
    this._gl.bindBufferBase(
      this._gl.UNIFORM_BUFFER,
      0,
      this._createPointsTransforms(),
    );
    this._gl.uniformMatrix3fv(
      this._pointsUniformLocations.viewTransform,
      false,
      this._createViewTransform(),
    );
    // TODO
    // this._gl.activeTexture(this._gl.TEXTURE0);
    // this._gl.bindTexture(this._gl.TEXTURE_2D, this._pointsMarkerAtlasTexture);
    this._gl.uniform1i(this._pointsUniformLocations.markerAtlas, 0);
    this._gl.drawArrays(this._gl.POINTS, 0, n);
    this._gl.bindVertexArray(null);
    this._gl.useProgram(null);
  }

  private _createPointsVAO(): WebGLVertexArrayObject {
    const pointsVAO = this._gl.createVertexArray();
    this._gl.bindVertexArray(pointsVAO);
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLController._POINTS_ATTRIB_LOCATIONS.X,
      this._pointsBuffers.x,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLController._POINTS_ATTRIB_LOCATIONS.Y,
      this._pointsBuffers.y,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLController._POINTS_ATTRIB_LOCATIONS.SIZE,
      this._pointsBuffers.size,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLController._POINTS_ATTRIB_LOCATIONS.COLOR,
      this._pointsBuffers.color,
      this._gl.UNSIGNED_INT,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLController._POINTS_ATTRIB_LOCATIONS.VISIBILITY,
      this._pointsBuffers.visibility,
      this._gl.UNSIGNED_BYTE,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLController._POINTS_ATTRIB_LOCATIONS.OPACITY,
      this._pointsBuffers.opacity,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLController._POINTS_ATTRIB_LOCATIONS.MARKER_INDEX,
      this._pointsBuffers.markerIndex,
      this._gl.UNSIGNED_BYTE,
      "int",
    );
    WebGLUtils.configureVertexAttribute(
      this._gl,
      WebGLController._POINTS_ATTRIB_LOCATIONS.TRANSFORM_INDEX,
      this._pointsBuffers.transformIndex,
      this._gl.UNSIGNED_BYTE,
      "int",
    );
    this._gl.bindVertexArray(null);
    return pointsVAO;
  }

  private _createPointsTransforms(): Float32Array {
    const pointsTransforms = new Float32Array(this._pbsInfos.length * 9);
    for (let i = 0; i < this._pbsInfos.length; i++) {
      const pbs = this._pbsInfos[i]!;
      const transform = WebGLController._createTransform(
        pbs.pointsInfo.layer,
        pbs.pointsInfo.layerConfig,
      );
      pointsTransforms.set(transform, i * 9);
    }
    return pointsTransforms;
  }

  private _createViewTransform(): Float32Array {
    // TODO
    throw new Error("View transform creation not implemented");
  }

  private static _createTransform(
    layer: ILayerModel,
    layerConfig: ILayerConfigModel,
  ): mat3 {
    const transform = mat3.create();
    if (layerConfig.scale) {
      mat3.scale(transform, transform, [layerConfig.scale, layerConfig.scale]);
    }
    if (layerConfig.flip) {
      mat3.scale(transform, transform, [-1, 1]);
    }
    if (layerConfig.rotation) {
      mat3.rotate(transform, transform, (layerConfig.rotation * Math.PI) / 180);
    }
    if (layerConfig.translation) {
      mat3.translate(transform, transform, [
        layerConfig.translation.x,
        layerConfig.translation.y,
      ]);
    }
    if (layer.scale) {
      mat3.scale(transform, transform, [layer.scale, layer.scale]);
    }
    if (layer.translation) {
      mat3.translate(transform, transform, [
        layer.translation.x,
        layer.translation.y,
      ]);
    }
    return transform;
  }
}

type PointsInfo = {
  layer: ILayerModel;
  points: IPointsModel;
  layerConfig: IPointsLayerConfigModel;
  data: IPointsData;
  xs: Float32Array;
  ys: Float32Array;
};

type BufferSliceInfo = {
  offset: number;
  length: number;
};

type PointsBufferSliceInfo = BufferSliceInfo & {
  pointsInfo: PointsInfo;
  pointsConfig: {
    layerVisibility?: boolean;
    layerOpacity?: number;
    pointsVisibility?: boolean;
    pointsOpacity?: number;
    pointXDimension: string;
    pointYDimension: string;
    pointSize?: number | TableValuesColumn | TableGroupsColumn;
    sizeMap?: string | { [key: string]: number };
    pointColor?: Color | TableValuesColumn | TableGroupsColumn;
    colorMap?: string | { [key: string]: Color };
    pointVisibility?: boolean | TableValuesColumn | TableGroupsColumn;
    visibilityMap?: string | { [key: string]: boolean };
    pointOpacity?: number | TableValuesColumn | TableGroupsColumn;
    opacityMap?: string | { [key: string]: number };
    pointMarker?: Marker | TableValuesColumn | TableGroupsColumn;
    markerMap?: string | { [key: string]: Marker };
  };
};
