import { mat3 } from "gl-matrix";

import markers from "../assets/markers.png?url";
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
  static readonly NMAX = 256; // see vertex shader
  private static readonly _ATTRIB_LOCATIONS = {
    I: 0,
    X: 1,
    Y: 2,
    SIZE: 3,
    COLOR: 4,
    VISIBILITY: 5,
    OPACITY: 6,
    MARKER_INDEX: 7,
  };
  private static readonly _BINDING_POINTS = {
    DATA_TO_WORLD_TRANSFORMS_UBO: 0,
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
    worldToViewportTransform: WebGLUniformLocation;
    markerAtlas: WebGLUniformLocation;
  };
  private readonly _uniformBlockIndices: {
    dataToWorldTransformsUBO: number;
  };
  private readonly _buffers: {
    i: WebGLBuffer;
    x: WebGLBuffer;
    y: WebGLBuffer;
    size: WebGLBuffer;
    color: WebGLBuffer;
    visibility: WebGLBuffer;
    opacity: WebGLBuffer;
    markerIndex: WebGLBuffer;
    dataToWorldTransformsUBO: WebGLBuffer;
  };
  private readonly _markerAtlasTexture: WebGLTexture;
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
    this._uniformBlockIndices = {
      dataToWorldTransformsUBO: this._gl.getUniformBlockIndex(
        this._program,
        "DataToWorldTransformsUBO",
      ),
    };
    this._buffers = {
      i: this._gl.createBuffer(),
      x: this._gl.createBuffer(),
      y: this._gl.createBuffer(),
      size: this._gl.createBuffer(),
      color: this._gl.createBuffer(),
      visibility: this._gl.createBuffer(),
      opacity: this._gl.createBuffer(),
      markerIndex: this._gl.createBuffer(),
      dataToWorldTransformsUBO: this._gl.createBuffer(),
    };
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.dataToWorldTransformsUBO,
      WebGLPointsController.NMAX * 9 * Float32Array.BYTES_PER_ELEMENT,
      gl.UNIFORM_BUFFER,
      gl.DYNAMIC_DRAW,
    );
    this._markerAtlasTexture = WebGLUtils.loadTexture(this._gl, markers);
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
    if (metas.length > WebGLPointsController.NMAX) {
      console.warn(`Only rendering ${WebGLPointsController.NMAX} objects`);
      metas.length = WebGLPointsController.NMAX;
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
    if (this._n === 0) {
      return;
    }
    this._gl.useProgram(this._program);
    this._gl.bindVertexArray(this._vao);
    this._gl.bindBufferBase(
      this._gl.UNIFORM_BUFFER,
      WebGLPointsController._BINDING_POINTS.DATA_TO_WORLD_TRANSFORMS_UBO,
      this._buffers.dataToWorldTransformsUBO,
    );
    this._gl.uniformBlockBinding(
      this._program,
      this._uniformBlockIndices.dataToWorldTransformsUBO,
      WebGLPointsController._BINDING_POINTS.DATA_TO_WORLD_TRANSFORMS_UBO,
    );
    this._gl.uniformMatrix3fv(
      this._uniformLocations.worldToViewportTransform,
      false,
      WebGLPointsController.createWorldToViewportTransform(viewport),
    );
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this._markerAtlasTexture);
    this._gl.uniform1i(this._uniformLocations.markerAtlas, 0);
    // TODO blending
    // this._gl.enable(this._gl.BLEND);
    // this._gl.blendFunc(this._gl.SRC_ALPHA, this._gl.ONE_MINUS_SRC_ALPHA);
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
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._buffers.i,
      WebGLPointsController._ATTRIB_LOCATIONS.I,
      1,
      this._gl.UNSIGNED_BYTE,
    );
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
    this._gl.bindVertexArray(null);
    return vao;
  }

  private _resizeBuffers(n: number): void {
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.i,
      n * Uint8Array.BYTES_PER_ELEMENT,
    );
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
    let i = 0;
    let offset = 0;
    const newBufferSlices: PointsBufferSlice[] = [];
    const dataToWorldTransformsUBOData = new Float32Array(metas.length * 9);
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
      if (bufferSliceChanged) {
        WebGLUtils.loadBufferData(
          this._gl,
          this._buffers.i,
          new Uint8Array(length).fill(i),
          offset,
        );
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointX !== meta.layerConfig.x
      ) {
        const xData = await meta.data.loadCoordinates(meta.layerConfig.x);
        if (checkAbort()) {
          return null;
        }
        WebGLUtils.loadBufferData(this._gl, this._buffers.x, xData, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointY !== meta.layerConfig.y
      ) {
        const yData = await meta.data.loadCoordinates(meta.layerConfig.y);
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
      newBufferSlices.push({
        offset: offset,
        length: length,
        meta: meta,
        config: {
          layerVisibility: meta.layer.visibility,
          layerOpacity: meta.layer.opacity,
          pointsVisibility: meta.points.visibility,
          pointsOpacity: meta.points.opacity,
          pointX: meta.layerConfig.x,
          pointY: meta.layerConfig.y,
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
      dataToWorldTransformsUBOData.set(
        mat3.multiply(
          mat3.create(),
          WebGLPointsController.createLayerToWorldTransform(meta.layer),
          WebGLPointsController.createDataToLayerTransform(meta.layerConfig),
        ),
        i * 9,
      );
      offset += length;
      i++;
    }
    WebGLUtils.loadBufferData(
      this._gl,
      this._buffers.dataToWorldTransformsUBO,
      dataToWorldTransformsUBOData,
    );
    return newBufferSlices;
  }

  private async _loadPointSizes(
    meta: PointsMeta,
    sizeMaps: Map<string, Map<string, number>>,
    loadTableByID: (tableId: string) => Promise<ITableData>,
    checkAbort: () => boolean,
  ): Promise<Float16Array | null> {
    const data = new Float16Array(meta.data.getLength());
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
    const data = new Float16Array(3 * meta.data.getLength());
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
    const data = new Uint8Array(meta.data.getLength());
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
    const data = new Float16Array(meta.data.getLength());
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
    const data = new Uint8Array(meta.data.getLength());
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
    pointX: string;
    pointY: string;
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
