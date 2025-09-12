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
import ArrayUtils from "../utils/ArrayUtils";
import ColorUtils from "../utils/ColorUtils";
import HashUtils from "../utils/HashUtils";
import WebGLUtils from "../utils/WebGLUtils";
import pointsFragmentShaderSource from "./shaders/points.frag?raw";
import pointsVertexShaderSource from "./shaders/points.vert?raw";

export default class WebGLManager {
  private readonly _canvas: HTMLCanvasElement;
  private _controller: WebGLController;

  constructor(parent: HTMLElement) {
    this._canvas = WebGLManager._createCanvas(parent);
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
    // TODO add more default point colors
  ];
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
  private _pointsBufferSliceInfos: PointsBufferSliceInfo[] = [];

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
        this._gl.getUniformLocation(this._pointsProgram, "u_viewTransform") ??
        (() => {
          throw new Error("Failed to get uniform location for u_viewTransform");
        })(),
      markerAtlas:
        this._gl.getUniformLocation(this._pointsProgram, "u_markerAtlas") ??
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
    if (this._pointsBufferSliceInfos.reduce((s, x) => s + x.length, 0) !== n) {
      this._resizePointsBuffers(n);
      pointsBuffersResized = true;
    }
    const newPointsBufferSliceInfos = await this._loadPoints(
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
    if (newPointsBufferSliceInfos === null || checkAbort()) {
      return false;
    }
    this._pointsBufferSliceInfos = newPointsBufferSliceInfos;
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
    // TODO synchronize shapes
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
      n * 3 * Float16Array.BYTES_PER_ELEMENT,
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
    const newPointsBufferSliceInfos: PointsBufferSliceInfo[] = [];
    for (const pointsInfo of pointsInfos) {
      const length = pointsInfo.xs.length;
      const pointsBufferSliceInfo = this._pointsBufferSliceInfos[i];
      const pointsBufferSliceChanged =
        pointsBuffersResized ||
        pointsBufferSliceInfo === undefined ||
        pointsBufferSliceInfo.offset !== offset ||
        pointsBufferSliceInfo.length !== length ||
        pointsBufferSliceInfo.pointsInfo.layer !== pointsInfo.layer ||
        pointsBufferSliceInfo.pointsInfo.points !== pointsInfo.points ||
        pointsBufferSliceInfo.pointsInfo.layerConfig !==
          pointsInfo.layerConfig ||
        pointsBufferSliceInfo.pointsInfo.data !== pointsInfo.data;
      // xs
      if (
        pointsBufferSliceChanged ||
        pointsBufferSliceInfo.pointsConfig.pointXDimension !==
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
        pointsBufferSliceInfo.pointsConfig.pointYDimension !==
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
        pointsBufferSliceInfo.pointsConfig.pointSize !==
          pointsInfo.points.pointSize ||
        pointsBufferSliceInfo.pointsConfig.sizeMap !== pointsInfo.points.sizeMap
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
        const success = await this._prepareBufferData<number>(
          sizeData,
          pointsInfo.points.pointSize,
          WebGLController._DEFAULT_POINT_SIZES,
          sizeMap,
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
        pointsBufferSliceInfo.pointsConfig.pointColor !==
          pointsInfo.points.pointColor ||
        pointsBufferSliceInfo.pointsConfig.colorMap !==
          pointsInfo.points.colorMap
      ) {
        const colorData = new Float16Array(3 * length);
        let colorMap = undefined;
        if (pointsInfo.points.colorMap !== undefined) {
          if (typeof pointsInfo.points.colorMap === "string") {
            colorMap = colorMaps.get(pointsInfo.points.colorMap);
          } else {
            colorMap = new Map(Object.entries(pointsInfo.points.colorMap));
          }
        }
        const success = await this._prepareBufferData<Color, string>(
          colorData,
          pointsInfo.points.pointColor,
          WebGLController._DEFAULT_POINT_COLORS,
          colorMap,
          loadTableByID,
          checkAbort,
          (colorValue) => [colorValue.r, colorValue.g, colorValue.b],
          (colorTableValue) => ColorUtils.parseHex(colorTableValue),
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
        pointsBufferSliceInfo.pointsConfig.layerVisibility !==
          pointsInfo.layer.visibility ||
        pointsBufferSliceInfo.pointsConfig.pointsVisibility !==
          pointsInfo.points.visibility ||
        pointsBufferSliceInfo.pointsConfig.pointVisibility !==
          pointsInfo.points.pointVisibility ||
        pointsBufferSliceInfo.pointsConfig.visibilityMap !==
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
          const success = await this._prepareBufferData<boolean>(
            visibilityData,
            pointsInfo.points.pointVisibility,
            WebGLController._DEFAULT_POINT_VISIBILITIES,
            visibilityMap,
            loadTableByID,
            checkAbort,
            (visibilityValue) => (visibilityValue ? 1 : 0),
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
        pointsBufferSliceInfo.pointsConfig.layerOpacity !==
          pointsInfo.layer.opacity ||
        pointsBufferSliceInfo.pointsConfig.pointsOpacity !==
          pointsInfo.points.opacity ||
        pointsBufferSliceInfo.pointsConfig.pointOpacity !==
          pointsInfo.points.pointOpacity ||
        pointsBufferSliceInfo.pointsConfig.opacityMap !==
          pointsInfo.points.opacityMap
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
        const success = await this._prepareBufferData<number>(
          opacityData,
          pointsInfo.points.pointOpacity,
          WebGLController._DEFAULT_POINT_OPACITIES,
          opacityMap,
          loadTableByID,
          checkAbort,
          (opacityValue) =>
            (pointsInfo.layer.opacity ?? 1.0) *
            (pointsInfo.points.opacity ?? 1.0) *
            opacityValue,
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
        pointsBufferSliceInfo.pointsConfig.pointMarker !==
          pointsInfo.points.pointMarker ||
        pointsBufferSliceInfo.pointsConfig.markerMap !==
          pointsInfo.points.markerMap
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
        const success = await this._prepareBufferData<Marker, number>(
          markerIndexData,
          pointsInfo.points.pointMarker,
          WebGLController._DEFAULT_POINT_MARKERS,
          markerMap,
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
      newPointsBufferSliceInfos.push({
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
    return newPointsBufferSliceInfos;
  }

  async _prepareBufferData<TValue, TTableValue = TValue>(
    arr: TypedArray,
    value: TValue | TableValuesColumn | TableGroupsColumn | undefined,
    defaultValues: TValue[],
    tableGroupValues: Map<string, TValue> | undefined,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
    toArrayValue: (value: TValue) => number | number[] = (value) =>
      value as unknown as number | number[],
    parseTableValue: (tableValue: TTableValue) => TValue = (tableValue) =>
      tableValue as unknown as TValue,
  ): Promise<boolean> {
    if (isTableValuesColumn(value)) {
      const tableData = await loadTableByID(value.tableId);
      if (checkAbort()) {
        return false;
      }
      const tableValues = await tableData.loadColumn<TTableValue>(
        value.valuesCol,
      );
      if (checkAbort()) {
        return false;
      }
      for (let i = 0; i < tableValues.length; i++) {
        const value = parseTableValue(tableValues[i]!);
        const arrayValue = toArrayValue(value);
        if (Array.isArray(arrayValue)) {
          arr.set(arrayValue, i * arrayValue.length);
        } else {
          arr[i] = arrayValue;
        }
      }
      return true;
    }
    if (isTableGroupsColumn(value)) {
      const tableData = await loadTableByID(value.tableId);
      if (checkAbort()) {
        return false;
      }
      const tableGroups = await tableData.loadColumn(value.groupsCol);
      if (checkAbort()) {
        return false;
      }
      for (let i = 0; i < tableGroups.length; i++) {
        const tableGroup = JSON.stringify(tableGroups[i]!);
        const value =
          tableGroupValues !== undefined
            ? (tableGroupValues.get(tableGroup) ?? defaultValues[0]!)
            : defaultValues[HashUtils.djb2(tableGroup) % defaultValues.length]!;
        const arrayValue = toArrayValue(value);
        if (Array.isArray(arrayValue)) {
          arr.set(arrayValue, i * arrayValue.length);
        } else {
          arr[i] = arrayValue;
        }
      }
      return true;
    }
    const arrayValue = toArrayValue(value ?? defaultValues[0]!);
    if (Array.isArray(arrayValue)) {
      ArrayUtils.fillSeq(arr, arrayValue);
    } else {
      arr.fill(arrayValue);
    }
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
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._pointsBuffers.x,
      WebGLController._POINTS_ATTRIB_LOCATIONS.X,
      1,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._pointsBuffers.y,
      WebGLController._POINTS_ATTRIB_LOCATIONS.Y,
      1,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._pointsBuffers.size,
      WebGLController._POINTS_ATTRIB_LOCATIONS.SIZE,
      1,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._pointsBuffers.color,
      WebGLController._POINTS_ATTRIB_LOCATIONS.COLOR,
      3,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._pointsBuffers.visibility,
      WebGLController._POINTS_ATTRIB_LOCATIONS.VISIBILITY,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._pointsBuffers.opacity,
      WebGLController._POINTS_ATTRIB_LOCATIONS.OPACITY,
      1,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._pointsBuffers.markerIndex,
      WebGLController._POINTS_ATTRIB_LOCATIONS.MARKER_INDEX,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._pointsBuffers.transformIndex,
      WebGLController._POINTS_ATTRIB_LOCATIONS.TRANSFORM_INDEX,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    this._gl.bindVertexArray(null);
    return pointsVAO;
  }

  private _createPointsTransforms(): Float32Array {
    const pointsTransforms = new Float32Array(
      this._pointsBufferSliceInfos.length * 9,
    );
    for (let i = 0; i < this._pointsBufferSliceInfos.length; i++) {
      const pbs = this._pointsBufferSliceInfos[i]!;
      const transform = WebGLController._createTransform(
        pbs.pointsInfo.layer,
        pbs.pointsInfo.layerConfig,
      );
      pointsTransforms.set(transform, i * 9);
    }
    return pointsTransforms;
  }

  private _createViewTransform(): Float32Array {
    // TODO view transform
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
