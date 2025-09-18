import { mat3 } from "gl-matrix";

import { IPointsData } from "../data/points";
import { ITableData } from "../data/table";
import { ILayerModel } from "../models/layer";
import { IPointsLayerConfigModel, IPointsModel } from "../models/points";
import {
  Color,
  Marker,
  TableGroupsColumn,
  TableValuesColumn,
} from "../models/types";
import ColorUtils from "../utils/ColorUtils";
import WebGLUtils from "../utils/WebGLUtils";
import WebGLController, { Viewport } from "./WebGLController";
import pointsFragmentShader from "./shaders/points.frag?raw";
import pointsVertexShader from "./shaders/points.vert?raw";

export default class WebGLPointsController extends WebGLController {
  private static readonly _ATTRIB_LOCATIONS = {
    X: 0,
    Y: 1,
    SIZE: 2,
    COLOR: 3,
    VISIBILITY: 4,
    OPACITY: 5,
    MARKER_INDEX: 6,
    TRANSFORM_INDEX: 7,
  };
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

  private readonly _program: WebGLProgram;
  private readonly _uniformLocations: {
    transformsUBO: GLuint;
    worldToViewportTransform: WebGLUniformLocation;
    markerAtlas: WebGLUniformLocation;
  };
  private readonly _buffers: {
    x: WebGLBuffer;
    y: WebGLBuffer;
    size: WebGLBuffer;
    color: WebGLBuffer;
    visibility: WebGLBuffer;
    opacity: WebGLBuffer;
    markerIndex: WebGLBuffer;
    transformIndex: WebGLBuffer;
    transformsUBO: WebGLBuffer;
  };
  private readonly _vao: WebGLVertexArrayObject;
  private _bufferSlices: PointsBufferSlice[] = [];
  private _n: number = 0;

  constructor(gl: WebGL2RenderingContext) {
    super(gl);
    this._program = WebGLUtils.loadProgram(
      this._gl,
      pointsVertexShader,
      pointsFragmentShader,
    );
    this._uniformLocations = {
      transformsUBO: this._gl.getUniformBlockIndex(
        this._program,
        "TransformsUBO",
      ),
      worldToViewportTransform:
        this._gl.getUniformLocation(
          this._program,
          "u_worldToViewportTransform",
        ) ??
        (() => {
          throw new Error(
            "Failed to get uniform location for u_worldToViewportTransform",
          );
        })(),
      markerAtlas:
        this._gl.getUniformLocation(this._program, "u_markerAtlas") ??
        (() => {
          throw new Error("Failed to get uniform location for u_markerAtlas");
        })(),
    };
    this._buffers = {
      x: this._gl.createBuffer(),
      y: this._gl.createBuffer(),
      size: this._gl.createBuffer(),
      color: this._gl.createBuffer(),
      visibility: this._gl.createBuffer(),
      opacity: this._gl.createBuffer(),
      markerIndex: this._gl.createBuffer(),
      transformIndex: this._gl.createBuffer(),
      transformsUBO: this._gl.createBuffer(),
    };
    this._vao = this._createVAO();
  }

  async synchronize(
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
    const metas = await this._collectPoints(
      layerMap,
      pointsMap,
      loadPoints,
      checkAbort,
    );
    if (metas === null || checkAbort()) {
      return false;
    }
    let buffersResized = false;
    const n = metas.reduce((s, meta) => s + meta.data.getLength(), 0);
    if (this._n !== n) {
      this._resizeBuffers(n);
      buffersResized = true;
    }
    const newBufferSlices = await this._loadPoints(
      metas,
      sizeMaps,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      markerMaps,
      buffersResized,
      loadTableByID,
      checkAbort,
    );
    if (newBufferSlices === null || checkAbort()) {
      return false;
    }
    this._bufferSlices = newBufferSlices;
    return true;
  }

  draw(viewport: Viewport): void {
    // TODO blending
    this._gl.useProgram(this._program);
    this._gl.bindVertexArray(this._vao);
    this._gl.uniformBlockBinding(
      this._program,
      this._uniformLocations.transformsUBO,
      0,
    );
    this._gl.bindBufferBase(
      this._gl.UNIFORM_BUFFER,
      0,
      this._buffers.transformsUBO,
    );
    this._gl.uniformMatrix3fv(
      this._uniformLocations.worldToViewportTransform,
      false,
      WebGLPointsController.createWorldToViewportTransform(viewport),
    );
    // TODO
    // this._gl.activeTexture(this._gl.TEXTURE0);
    // this._gl.bindTexture(this._gl.TEXTURE_2D, this._pointsMarkerAtlasTexture);
    this._gl.uniform1i(this._uniformLocations.markerAtlas, 0);
    this._gl.drawArrays(this._gl.POINTS, 0, this._n);
    this._gl.bindVertexArray(null);
    this._gl.useProgram(null);
  }

  destroy(): void {
    this._gl.deleteProgram(this._program);
    for (const buffer of Object.values(this._buffers)) {
      this._gl.deleteBuffer(buffer);
    }
  }

  private _createVAO(): WebGLVertexArrayObject {
    const vao = this._gl.createVertexArray();
    this._gl.bindVertexArray(vao);
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._buffers.x,
      WebGLPointsController._ATTRIB_LOCATIONS.X,
      1,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._buffers.y,
      WebGLPointsController._ATTRIB_LOCATIONS.Y,
      1,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._buffers.size,
      WebGLPointsController._ATTRIB_LOCATIONS.SIZE,
      1,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._buffers.color,
      WebGLPointsController._ATTRIB_LOCATIONS.COLOR,
      3,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._buffers.visibility,
      WebGLPointsController._ATTRIB_LOCATIONS.VISIBILITY,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._buffers.opacity,
      WebGLPointsController._ATTRIB_LOCATIONS.OPACITY,
      1,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._buffers.markerIndex,
      WebGLPointsController._ATTRIB_LOCATIONS.MARKER_INDEX,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._buffers.transformIndex,
      WebGLPointsController._ATTRIB_LOCATIONS.TRANSFORM_INDEX,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    this._gl.bindVertexArray(null);
    return vao;
  }

  private _resizeBuffers(n: number): void {
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.x,
      n * Float32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.y,
      n * Float32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.size,
      n * Float16Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.color,
      n * 3 * Float16Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.visibility,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.opacity,
      n * Float16Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.markerIndex,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.transformIndex,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
    this._n = n;
  }

  private async _collectPoints(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    loadPoints: (points: IPointsModel) => Promise<IPointsData>,
    checkAbort: () => boolean,
  ): Promise<PointsMeta[] | null> {
    const metas: PointsMeta[] = [];
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
            metas.push({
              layer: layer,
              points: points,
              layerConfig: layerConfig,
              data: data,
            });
          }
        }
      }
    }
    return metas;
  }

  private async _loadPoints(
    metas: PointsMeta[],
    sizeMaps: Map<string, Map<string, number>>,
    colorMaps: Map<string, Map<string, Color>>,
    visibilityMaps: Map<string, Map<string, boolean>>,
    opacityMaps: Map<string, Map<string, number>>,
    markerMaps: Map<string, Map<string, Marker>>,
    buffersResized: boolean,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<PointsBufferSlice[] | null> {
    // TODO this._createDataToWorldTransforms()
    let i = 0;
    let offset = 0;
    const newBufferSlices: PointsBufferSlice[] = [];
    const transformsUBOData = new Float32Array(metas.length * 9);
    for (const meta of metas) {
      const length = meta.data.getLength();
      const bufferSlice = this._bufferSlices[i];
      const bufferSliceChanged =
        buffersResized ||
        bufferSlice === undefined ||
        bufferSlice.offset !== offset ||
        bufferSlice.length !== length ||
        bufferSlice.meta.layer !== meta.layer ||
        bufferSlice.meta.points !== meta.points ||
        bufferSlice.meta.layerConfig !== meta.layerConfig ||
        bufferSlice.meta.data !== meta.data;
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointXDimension !== meta.layerConfig.pointXDimension
      ) {
        const xData = await meta.data.loadCoordinates(
          meta.layerConfig.pointXDimension,
        );
        if (checkAbort()) {
          return null;
        }
        WebGLUtils.loadBufferData(this._gl, this._buffers.x, xData, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointYDimension !== meta.layerConfig.pointYDimension
      ) {
        const yData = await meta.data.loadCoordinates(
          meta.layerConfig.pointYDimension,
        );
        if (checkAbort()) {
          return null;
        }
        WebGLUtils.loadBufferData(this._gl, this._buffers.y, yData, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointSize !== meta.points.pointSize ||
        bufferSlice.config.sizeMap !== meta.points.sizeMap
      ) {
        const sizeData = await this._loadPointSizes(
          meta,
          sizeMaps,
          loadTableByID,
          checkAbort,
        );
        if (sizeData === null || checkAbort()) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._buffers.size,
          sizeData,
          offset,
        );
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointColor !== meta.points.pointColor ||
        bufferSlice.config.colorMap !== meta.points.colorMap
      ) {
        const colorData = await this._loadPointColors(
          meta,
          colorMaps,
          loadTableByID,
          checkAbort,
        );
        if (colorData === null || checkAbort()) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._buffers.color,
          colorData,
          offset,
        );
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.layerVisibility !== meta.layer.visibility ||
        bufferSlice.config.pointsVisibility !== meta.points.visibility ||
        bufferSlice.config.pointVisibility !== meta.points.pointVisibility ||
        bufferSlice.config.visibilityMap !== meta.points.visibilityMap
      ) {
        const visibilityData = await this._loadPointVisibilities(
          meta,
          visibilityMaps,
          loadTableByID,
          checkAbort,
        );
        if (visibilityData === null || checkAbort()) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._buffers.visibility,
          visibilityData,
          offset,
        );
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.layerOpacity !== meta.layer.opacity ||
        bufferSlice.config.pointsOpacity !== meta.points.opacity ||
        bufferSlice.config.pointOpacity !== meta.points.pointOpacity ||
        bufferSlice.config.opacityMap !== meta.points.opacityMap
      ) {
        const opacityData = await this._loadPointOpacities(
          meta,
          opacityMaps,
          loadTableByID,
          checkAbort,
        );
        if (opacityData === null || checkAbort()) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._buffers.opacity,
          opacityData,
          offset,
        );
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointMarker !== meta.points.pointMarker ||
        bufferSlice.config.markerMap !== meta.points.markerMap
      ) {
        const markerIndexData = await this._loadPointMarkerIndices(
          meta,
          markerMaps,
          loadTableByID,
          checkAbort,
        );
        if (markerIndexData === null || checkAbort()) {
          return null;
        }
        WebGLUtils.loadBufferData(
          this._gl,
          this._buffers.markerIndex,
          markerIndexData,
          offset,
        );
      }
      if (bufferSliceChanged) {
        const transformIndexData = new Uint8Array(length).fill(i);
        WebGLUtils.loadBufferData(
          this._gl,
          this._buffers.transformIndex,
          transformIndexData,
          offset,
        );
      }
      newBufferSlices.push({
        offset: offset,
        length: length,
        meta: meta,
        config: {
          layerVisibility: meta.layer.visibility,
          layerOpacity: meta.layer.opacity,
          pointsVisibility: meta.points.visibility,
          pointsOpacity: meta.points.opacity,
          pointXDimension: meta.layerConfig.pointXDimension,
          pointYDimension: meta.layerConfig.pointYDimension,
          pointSize: meta.points.pointSize,
          sizeMap: meta.points.sizeMap,
          pointColor: meta.points.pointColor,
          colorMap: meta.points.colorMap,
          pointVisibility: meta.points.pointVisibility,
          visibilityMap: meta.points.visibilityMap,
          pointOpacity: meta.points.pointOpacity,
          opacityMap: meta.points.opacityMap,
          pointMarker: meta.points.pointMarker,
          markerMap: meta.points.markerMap,
        },
      });
      const dataToWorldTransform = mat3.multiply(
        mat3.create(),
        WebGLPointsController.createLayerToWorldTransform(meta.layer),
        WebGLPointsController.createDataToLayerTransform(meta.layerConfig),
      );
      transformsUBOData.set(dataToWorldTransform, i * 9);
      offset += length;
      i++;
    }
    WebGLUtils.loadBufferData(
      this._gl,
      this._buffers.transformsUBO,
      transformsUBOData,
    );
    return newBufferSlices;
  }

  private async _loadPointSizes(
    meta: PointsMeta,
    sizeMaps: Map<string, Map<string, number>>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<Float16Array | null> {
    const data = new Float16Array(length);
    let sizeMap = undefined;
    if (meta.points.sizeMap !== undefined) {
      if (typeof meta.points.sizeMap === "string") {
        sizeMap = sizeMaps.get(meta.points.sizeMap);
      } else {
        sizeMap = new Map(Object.entries(meta.points.sizeMap));
      }
    }
    const success = await this._prepareBufferData<number>(
      data,
      meta.points.pointSize,
      WebGLPointsController._DEFAULT_POINT_SIZES,
      sizeMap,
      loadTableByID,
      checkAbort,
    );
    if (!success || checkAbort()) {
      return null;
    }
    return data;
  }

  private async _loadPointColors(
    meta: PointsMeta,
    colorMaps: Map<string, Map<string, Color>>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<Float16Array | null> {
    const data = new Float16Array(3 * length);
    let colorMap = undefined;
    if (meta.points.colorMap !== undefined) {
      if (typeof meta.points.colorMap === "string") {
        colorMap = colorMaps.get(meta.points.colorMap);
      } else {
        colorMap = new Map(Object.entries(meta.points.colorMap));
      }
    }
    const success = await this._prepareBufferData<Color, string>(
      data,
      meta.points.pointColor,
      WebGLPointsController._DEFAULT_POINT_COLORS,
      colorMap,
      loadTableByID,
      checkAbort,
      (colorValue) => [colorValue.r, colorValue.g, colorValue.b],
      (colorTableValue) => ColorUtils.parseHex(colorTableValue),
    );
    if (!success || checkAbort()) {
      return null;
    }
    return data;
  }

  private async _loadPointVisibilities(
    meta: PointsMeta,
    visibilityMaps: Map<string, Map<string, boolean>>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<Uint8Array | null> {
    const data = new Uint8Array(length);
    if (meta.layer.visibility === false || meta.points.visibility === false) {
      data.fill(0);
    } else {
      let visibilityMap = undefined;
      if (meta.points.visibilityMap !== undefined) {
        if (typeof meta.points.visibilityMap === "string") {
          visibilityMap = visibilityMaps.get(meta.points.visibilityMap);
        } else {
          visibilityMap = new Map(Object.entries(meta.points.visibilityMap));
        }
      }
      const success = await this._prepareBufferData<boolean>(
        data,
        meta.points.pointVisibility,
        WebGLPointsController._DEFAULT_POINT_VISIBILITIES,
        visibilityMap,
        loadTableByID,
        checkAbort,
        (visibilityValue) => (visibilityValue ? 1 : 0),
      );
      if (!success || checkAbort()) {
        return null;
      }
    }
    return data;
  }

  private async _loadPointOpacities(
    meta: PointsMeta,
    opacityMaps: Map<string, Map<string, number>>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<Float16Array | null> {
    const data = new Float16Array(length);
    let opacityMap = undefined;
    if (meta.points.opacityMap !== undefined) {
      if (typeof meta.points.opacityMap === "string") {
        opacityMap = opacityMaps.get(meta.points.opacityMap);
      } else {
        opacityMap = new Map(Object.entries(meta.points.opacityMap));
      }
    }
    const success = await this._prepareBufferData<number>(
      data,
      meta.points.pointOpacity,
      WebGLPointsController._DEFAULT_POINT_OPACITIES,
      opacityMap,
      loadTableByID,
      checkAbort,
      (opacityValue) =>
        (meta.layer.opacity ?? 1.0) *
        (meta.points.opacity ?? 1.0) *
        opacityValue,
    );
    if (!success || checkAbort()) {
      return null;
    }
    return data;
  }

  private async _loadPointMarkerIndices(
    meta: PointsMeta,
    markerMaps: Map<string, Map<string, Marker>>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<Uint8Array | null> {
    const data = new Uint8Array(length);
    let markerMap = undefined;
    if (meta.points.markerMap !== undefined) {
      if (typeof meta.points.markerMap === "string") {
        markerMap = markerMaps.get(meta.points.markerMap);
      } else {
        markerMap = new Map(Object.entries(meta.points.markerMap));
      }
    }
    const success = await this._prepareBufferData<Marker, number>(
      data,
      meta.points.pointMarker,
      WebGLPointsController._DEFAULT_POINT_MARKERS,
      markerMap,
      loadTableByID,
      checkAbort,
    );
    if (!success || checkAbort()) {
      return null;
    }
    return data;
  }
}

type PointsMeta = {
  layer: ILayerModel;
  points: IPointsModel;
  layerConfig: IPointsLayerConfigModel;
  data: IPointsData;
};

type PointsBufferSlice = {
  offset: number;
  length: number;
  meta: PointsMeta;
  config: {
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
