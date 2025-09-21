import { mat3 } from "gl-matrix";

import batlowS from "../assets/colormaps/batlowS.txt?raw";
import markersUrl from "../assets/markers/markers.png?url";
import pointsFragmentShader from "../assets/shaders/points.frag?raw";
import pointsVertexShader from "../assets/shaders/points.vert?raw";
import { IPointsData } from "../data/points";
import { ITableData } from "../data/table";
import { ILayerModel } from "../models/layer";
import { IPointsLayerConfigModel, IPointsModel } from "../models/points";
import {
  BlendMode,
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
import { Rect } from "./WebGLController";
import WebGLControllerBase from "./WebGLControllerBase";

// TODO:
// - marker stroke/fill/outline
// - point sorting/zorder (?)
// - react to OpenSeadragon collection mode, viewer rotation, ...
// - chunked loading
// - chunked drawing

// Not implemented:
// - instancing
// - pie charts

export default class WebGLPointsController extends WebGLControllerBase {
  private static readonly _MAX_N_OBJECTS = 256; // see vertex shader
  private static readonly _ATTRIB_LOCATIONS = {
    X: 0,
    Y: 1,
    SIZE: 2,
    COLOR: 3,
    MARKER_INDEX: 4,
    OBJECT_INDEX: 5,
  };
  private static readonly _BINDING_POINTS = {
    DATA_TO_WORLD_TRANSFORMS_UBO: 0,
  };
  private static readonly _DEFAULT_POINT_SIZE: number = 1.0;
  private static readonly _DEFAULT_POINT_SIZES: number[] = [1.0];
  private static readonly _DEFAULT_POINT_COLOR: Color = { r: 0, g: 0, b: 0 };
  private static readonly _DEFAULT_POINT_COLORS: Color[] =
    ColorUtils.parseColormap(batlowS);
  private static readonly _DEFAULT_POINT_VISIBILITY: boolean = true;
  private static readonly _DEFAULT_POINT_VISIBILITIES: boolean[] = [true];
  private static readonly _DEFAULT_POINT_OPACITY: number = 1.0;
  private static readonly _DEFAULT_POINT_OPACITIES: number[] = [1.0];
  private static readonly _DEFAULT_POINT_MARKER: Marker = Marker.Disc;
  private static readonly _DEFAULT_POINT_MARKERS: Marker[] = [
    Marker.Cross,
    Marker.Diamond,
    Marker.Square,
    Marker.TriangleUp,
    Marker.Star,
    Marker.Clobber,
    Marker.Disc,
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
    sizeFactor: WebGLUniformLocation;
  };
  private readonly _uniformBlockIndices: {
    dataToWorldTransformsUBO: number;
  };
  private readonly _buffers: {
    x: WebGLBuffer;
    y: WebGLBuffer;
    size: WebGLBuffer;
    color: WebGLBuffer;
    markerIndex: WebGLBuffer;
    objectIndex: WebGLBuffer;
    dataToWorldTransformsUBO: WebGLBuffer;
  };
  private readonly _vao: WebGLVertexArrayObject;
  private _markerAtlasTexture: WebGLTexture | undefined;
  private _bufferSlices: PointsBufferSlice[] = [];
  private _nPoints: number = 0;

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
      sizeFactor:
        this._gl.getUniformLocation(this._program, "u_sizeFactor") ??
        (() => {
          throw new Error("Failed to get uniform location for u_sizeFactor");
        })(),
    };
    this._uniformBlockIndices = {
      dataToWorldTransformsUBO: this._gl.getUniformBlockIndex(
        this._program,
        "DataToWorldTransformsUBO",
      ),
    };
    this._buffers = {
      x: this._gl.createBuffer(),
      y: this._gl.createBuffer(),
      size: this._gl.createBuffer(),
      color: this._gl.createBuffer(),
      markerIndex: this._gl.createBuffer(),
      objectIndex: this._gl.createBuffer(),
      dataToWorldTransformsUBO: this._gl.createBuffer(),
    };
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.dataToWorldTransformsUBO,
      WebGLPointsController._MAX_N_OBJECTS * 8 * Float32Array.BYTES_PER_ELEMENT,
      gl.UNIFORM_BUFFER,
      gl.DYNAMIC_DRAW,
    );
    this._vao = this._createVAO();
  }

  async initialize(): Promise<WebGLPointsController> {
    this._markerAtlasTexture = await WebGLUtils.loadTexture(
      this._gl,
      markersUrl,
    );
    return this;
  }

  async synchronize(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    sizeMaps: Map<string, Map<string, number>>,
    colorMaps: Map<string, Map<string, Color>>,
    visibilityMaps: Map<string, Map<string, boolean>>,
    opacityMaps: Map<string, Map<string, number>>,
    markerMaps: Map<string, Map<string, Marker>>,
    loadPoints: (
      points: IPointsModel,
      signal?: AbortSignal,
    ) => Promise<IPointsData>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    const metas = await this._collectPoints(
      layerMap,
      pointsMap,
      loadPoints,
      signal,
    );
    signal?.throwIfAborted();
    if (metas.length > WebGLPointsController._MAX_N_OBJECTS) {
      console.warn(
        `Only rendering the first ${WebGLPointsController._MAX_N_OBJECTS} out of ${metas.length} objects`,
      );
      metas.length = WebGLPointsController._MAX_N_OBJECTS;
    }
    let buffersResized = false;
    const nPoints = metas.reduce((s, meta) => s + meta.data.getLength(), 0);
    if (this._nPoints !== nPoints) {
      this._resizeBuffers(nPoints);
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
      signal,
    );
    signal?.throwIfAborted();
    this._bufferSlices = newBufferSlices;
  }

  draw(viewport: Rect, blendMode: BlendMode, sizeFactor: number): void {
    if (this._nPoints === 0 || this._markerAtlasTexture === undefined) {
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
    const tf = WebGLPointsController.createWorldToViewportTransform(viewport);
    const glMat3x2 = [tf[0], tf[1], tf[3], tf[4], tf[6], tf[7]];
    this._gl.uniformMatrix3x2fv(
      this._uniformLocations.worldToViewportTransform,
      false,
      glMat3x2,
    );
    this._gl.uniform1f(this._uniformLocations.sizeFactor, sizeFactor);
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this._markerAtlasTexture);
    this._gl.uniform1i(this._uniformLocations.markerAtlas, 0);
    this._gl.enable(this._gl.BLEND);
    // https://en.wikipedia.org/wiki/Alpha_compositing
    // https://learnopengl.com/Advanced-OpenGL/Blending
    // https://www.khronos.org/opengl/wiki/Blending
    // https://www.realtimerendering.com/blog/gpus-prefer-premultiplication/
    switch (blendMode) {
      // additive blending / plus operator (Porter & Duff)
      case "add": {
        this._gl.blendEquation(this._gl.FUNC_ADD);
        this._gl.blendFuncSeparate(
          this._gl.ONE, // alpha is premultiplied in fragment shader
          this._gl.ONE,
          this._gl.ONE,
          this._gl.ONE,
        );
        break;
      }
      // traditional alpha blending / over operator (Porter & Duff)
      case "over": {
        this._gl.blendEquation(this._gl.FUNC_ADD);
        this._gl.blendFuncSeparate(
          this._gl.ONE, // alpha is premultiplied in fragment shader
          this._gl.ONE_MINUS_SRC_ALPHA,
          this._gl.ONE,
          this._gl.ONE_MINUS_SRC_ALPHA,
        );
      }
    }
    this._gl.drawArrays(this._gl.POINTS, 0, this._nPoints);
    this._gl.blendEquation(this._gl.FUNC_ADD);
    this._gl.blendFuncSeparate(
      this._gl.ONE,
      this._gl.ZERO,
      this._gl.ONE,
      this._gl.ZERO,
    );
    this._gl.disable(this._gl.BLEND);
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
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._buffers.color,
      WebGLPointsController._ATTRIB_LOCATIONS.COLOR,
      1,
      this._gl.UNSIGNED_INT,
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
      this._buffers.objectIndex,
      WebGLPointsController._ATTRIB_LOCATIONS.OBJECT_INDEX,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    this._gl.bindVertexArray(null);
    return vao;
  }

  private _resizeBuffers(nPoints: number): void {
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.x,
      nPoints * Float32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.y,
      nPoints * Float32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.size,
      nPoints * Float16Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.color,
      nPoints * Uint32Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.markerIndex,
      nPoints * Uint8Array.BYTES_PER_ELEMENT,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.objectIndex,
      nPoints * Uint8Array.BYTES_PER_ELEMENT,
    );
    this._nPoints = nPoints;
  }

  private async _collectPoints(
    layerMap: Map<string, ILayerModel>,
    pointsMap: Map<string, IPointsModel>,
    loadPoints: (
      points: IPointsModel,
      signal?: AbortSignal,
    ) => Promise<IPointsData>,
    signal?: AbortSignal,
  ): Promise<PointsMeta[]> {
    signal?.throwIfAborted();
    const metas: PointsMeta[] = [];
    for (const layer of layerMap.values()) {
      for (const points of pointsMap.values()) {
        for (const layerConfig of points.layerConfigs.filter(
          (layerConfig) => layerConfig.layerId === layer.id,
        )) {
          let data = null;
          try {
            data = await loadPoints(points, signal);
          } catch (error) {
            console.error(
              `Failed to load points with ID '${points.id}'`,
              error,
            );
          }
          signal?.throwIfAborted();
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
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
    signal?: AbortSignal,
  ): Promise<PointsBufferSlice[]> {
    signal?.throwIfAborted();
    let i = 0;
    let offset = 0;
    const newBufferSlices: PointsBufferSlice[] = [];
    const dataToWorldTransformsUBOData = new Float32Array(metas.length * 8);
    for (const meta of metas) {
      const nPoints = meta.data.getLength();
      const bufferSlice = this._bufferSlices[i];
      const bufferSliceChanged =
        buffersResized ||
        bufferSlice === undefined ||
        bufferSlice.offset !== offset ||
        bufferSlice.nPoints !== nPoints ||
        bufferSlice.meta.layer !== meta.layer ||
        bufferSlice.meta.points !== meta.points ||
        bufferSlice.meta.layerConfig !== meta.layerConfig ||
        bufferSlice.meta.data !== meta.data;
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointX !== meta.layerConfig.x
      ) {
        const data = await meta.data.loadCoordinates(
          meta.layerConfig.x,
          signal,
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(this._gl, this._buffers.x, data, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointY !== meta.layerConfig.y
      ) {
        const data = await meta.data.loadCoordinates(
          meta.layerConfig.y,
          signal,
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(this._gl, this._buffers.y, data, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointSize !== meta.points.pointSize ||
        bufferSlice.config.sizeMap !== meta.points.sizeMap
      ) {
        await this._loadPointSizeBuffer(
          offset,
          meta,
          sizeMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.layerVisibility !== meta.layer.visibility ||
        bufferSlice.config.layerOpacity !== meta.layer.opacity ||
        bufferSlice.config.pointsVisibility !== meta.points.visibility ||
        bufferSlice.config.pointsOpacity !== meta.points.opacity ||
        bufferSlice.config.pointVisibility !== meta.points.pointVisibility ||
        bufferSlice.config.visibilityMap !== meta.points.visibilityMap ||
        bufferSlice.config.pointOpacity !== meta.points.pointOpacity ||
        bufferSlice.config.opacityMap !== meta.points.opacityMap ||
        bufferSlice.config.pointColor !== meta.points.pointColor ||
        bufferSlice.config.colorMap !== meta.points.colorMap
      ) {
        await this._loadPointColorBuffer(
          offset,
          meta,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
      }
      if (
        bufferSliceChanged ||
        bufferSlice.config.pointMarker !== meta.points.pointMarker ||
        bufferSlice.config.markerMap !== meta.points.markerMap
      ) {
        await this._loadPointMarkerIndexBuffer(
          offset,
          meta,
          markerMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
      }
      if (bufferSliceChanged) {
        WebGLUtils.loadBuffer(
          this._gl,
          this._buffers.objectIndex,
          new Uint8Array(nPoints).fill(i),
          offset,
        );
      }
      newBufferSlices.push({
        offset: offset,
        nPoints: nPoints,
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
      const tf = mat3.multiply(
        mat3.create(),
        WebGLPointsController.createLayerToWorldTransform(meta.layer),
        WebGLPointsController.createDataToLayerTransform(meta.layerConfig),
      );
      const glMat2x4 = [tf[0], tf[3], tf[6], 0, tf[1], tf[4], tf[7], 0];
      dataToWorldTransformsUBOData.set(glMat2x4, i * 8);
      offset += nPoints;
      i++;
    }
    WebGLUtils.loadBuffer(
      this._gl,
      this._buffers.dataToWorldTransformsUBO,
      dataToWorldTransformsUBOData,
    );
    return newBufferSlices;
  }

  private async _loadPointSizeBuffer(
    offset: number,
    meta: PointsMeta,
    sizeMaps: Map<string, Map<string, number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    const data = new Float16Array(meta.data.getLength());
    if (meta.points.pointSize === undefined) {
      data.fill(WebGLPointsController._DEFAULT_POINT_SIZE);
    } else if (isTableValuesColumn(meta.points.pointSize)) {
      const tableData = await loadTableByID(
        meta.points.pointSize.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        meta.points.pointSize.valuesCol,
        signal,
      );
      signal?.throwIfAborted();
      data.set(tableValues);
    } else if (isTableGroupsColumn(meta.points.pointSize)) {
      const tableData = await loadTableByID(
        meta.points.pointSize.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(
        meta.points.pointSize.groupsCol,
        signal,
      );
      signal?.throwIfAborted();
      let sizeMap = undefined;
      if (meta.points.sizeMap !== undefined) {
        if (typeof meta.points.sizeMap === "string") {
          sizeMap = sizeMaps.get(meta.points.sizeMap);
        } else {
          sizeMap = new Map(Object.entries(meta.points.sizeMap));
        }
      }
      if (sizeMap !== undefined) {
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          data[i] =
            sizeMap.get(group) ?? WebGLPointsController._DEFAULT_POINT_SIZE;
        }
      } else {
        for (let i = 0; i < tableGroups.length; i++) {
          const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
          data[i] =
            WebGLPointsController._DEFAULT_POINT_SIZES[
              hash % WebGLPointsController._DEFAULT_POINT_SIZES.length
            ]!;
        }
      }
    } else {
      data.fill(meta.points.pointSize);
    }
    WebGLUtils.loadBuffer(this._gl, this._buffers.size, data, offset);
  }

  private async _loadPointColorBuffer(
    offset: number,
    meta: PointsMeta,
    colorMaps: Map<string, Map<string, Color>>,
    visibilityMaps: Map<string, Map<string, boolean>>,
    opacityMaps: Map<string, Map<string, number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    const data = new Uint32Array(meta.data.getLength());
    if (
      meta.layer.visibility === false ||
      meta.layer.opacity === 0 ||
      meta.points.visibility === false ||
      meta.points.opacity === 0
    ) {
      data.fill(0);
    } else {
      if (meta.points.pointColor === undefined) {
        data.fill(
          ColorUtils.packColor(WebGLPointsController._DEFAULT_POINT_COLOR),
        );
      } else if (isTableValuesColumn(meta.points.pointColor)) {
        const tableData = await loadTableByID(
          meta.points.pointColor.tableId,
          signal,
        );
        signal?.throwIfAborted();
        const tableValues = await tableData.loadColumn<string>(
          meta.points.pointColor.valuesCol,
          signal,
        );
        signal?.throwIfAborted();
        for (let i = 0; i < tableValues.length; i++) {
          data[i] = ColorUtils.packColor(
            ColorUtils.parseColor(tableValues[i]!),
          );
        }
      } else if (isTableGroupsColumn(meta.points.pointColor)) {
        const tableData = await loadTableByID(
          meta.points.pointColor.tableId,
          signal,
        );
        signal?.throwIfAborted();
        const tableGroups = await tableData.loadColumn(
          meta.points.pointColor.groupsCol,
          signal,
        );
        signal?.throwIfAborted();
        let colorMap = undefined;
        if (meta.points.colorMap !== undefined) {
          if (typeof meta.points.colorMap === "string") {
            colorMap = colorMaps.get(meta.points.colorMap);
          } else {
            colorMap = new Map(Object.entries(meta.points.colorMap));
          }
        }
        if (colorMap !== undefined) {
          for (let i = 0; i < tableGroups.length; i++) {
            const group = JSON.stringify(tableGroups[i]!);
            const color =
              colorMap.get(group) ?? WebGLPointsController._DEFAULT_POINT_COLOR;
            data[i] = ColorUtils.packColor(color);
          }
        } else {
          for (let i = 0; i < tableGroups.length; i++) {
            const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
            const color =
              WebGLPointsController._DEFAULT_POINT_COLORS[
                hash % WebGLPointsController._DEFAULT_POINT_COLORS.length
              ]!;
            data[i] = ColorUtils.packColor(color);
          }
        }
      } else {
        data.fill(ColorUtils.packColor(meta.points.pointColor));
      }
      const visibilities = await this._loadPointVisibilities(
        meta,
        visibilityMaps,
        loadTableByID,
        signal,
      );
      signal?.throwIfAborted();
      const opacities = await this._loadPointOpacities(
        meta,
        opacityMaps,
        loadTableByID,
        signal,
      );
      signal?.throwIfAborted();
      for (let i = 0; i < data.length; i++) {
        data[i] = (data[i]! << 8) + (visibilities[i]! > 0 ? opacities[i]! : 0);
      }
    }
    WebGLUtils.loadBuffer(this._gl, this._buffers.color, data, offset);
  }

  private async _loadPointMarkerIndexBuffer(
    offset: number,
    meta: PointsMeta,
    markerMaps: Map<string, Map<string, Marker>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    const data = new Uint8Array(meta.data.getLength());
    if (meta.points.pointMarker === undefined) {
      data.fill(WebGLPointsController._DEFAULT_POINT_MARKER);
    } else if (isTableValuesColumn(meta.points.pointMarker)) {
      const tableData = await loadTableByID(
        meta.points.pointMarker.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<string>(
        meta.points.pointMarker.valuesCol,
        signal,
      );
      signal?.throwIfAborted();
      for (let i = 0; i < tableValues.length; i++) {
        data[i] = Marker[tableValues[i]! as keyof typeof Marker];
      }
    } else if (isTableGroupsColumn(meta.points.pointMarker)) {
      const tableData = await loadTableByID(
        meta.points.pointMarker.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(
        meta.points.pointMarker.groupsCol,
        signal,
      );
      signal?.throwIfAborted();
      let markerMap = undefined;
      if (meta.points.markerMap !== undefined) {
        if (typeof meta.points.markerMap === "string") {
          markerMap = markerMaps.get(meta.points.markerMap);
        } else {
          markerMap = new Map(Object.entries(meta.points.markerMap));
        }
      }
      if (markerMap !== undefined) {
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          data[i] =
            markerMap.get(group) ?? WebGLPointsController._DEFAULT_POINT_MARKER;
        }
      } else {
        for (let i = 0; i < tableGroups.length; i++) {
          const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
          data[i] =
            WebGLPointsController._DEFAULT_POINT_MARKERS[
              hash % WebGLPointsController._DEFAULT_POINT_MARKERS.length
            ]!;
        }
      }
    } else {
      data.fill(meta.points.pointMarker);
    }
    WebGLUtils.loadBuffer(this._gl, this._buffers.markerIndex, data, offset);
  }

  private async _loadPointVisibilities(
    meta: PointsMeta,
    visibilityMaps: Map<string, Map<string, boolean>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const visibilities = new Uint8Array(meta.data.getLength());
    if (meta.points.pointVisibility === undefined) {
      visibilities.fill(
        WebGLPointsController._DEFAULT_POINT_VISIBILITY ? 1 : 0,
      );
    } else if (isTableValuesColumn(meta.points.pointVisibility)) {
      const tableData = await loadTableByID(
        meta.points.pointVisibility.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        meta.points.pointVisibility.valuesCol,
        signal,
      );
      signal?.throwIfAborted();
      visibilities.set(tableValues);
    } else if (isTableGroupsColumn(meta.points.pointVisibility)) {
      const tableData = await loadTableByID(
        meta.points.pointVisibility.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(
        meta.points.pointVisibility.groupsCol,
        signal,
      );
      signal?.throwIfAborted();
      let visibilityMap = undefined;
      if (meta.points.visibilityMap !== undefined) {
        if (typeof meta.points.visibilityMap === "string") {
          visibilityMap = visibilityMaps.get(meta.points.visibilityMap);
        } else {
          visibilityMap = new Map(Object.entries(meta.points.visibilityMap));
        }
      }
      if (visibilityMap !== undefined) {
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const visibility =
            visibilityMap.get(group) ??
            WebGLPointsController._DEFAULT_POINT_VISIBILITY;
          visibilities[i] = visibility ? 1 : 0;
        }
      } else {
        for (let i = 0; i < tableGroups.length; i++) {
          const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
          const visibility =
            WebGLPointsController._DEFAULT_POINT_VISIBILITIES[
              hash % WebGLPointsController._DEFAULT_POINT_VISIBILITIES.length
            ]!;
          visibilities[i] = visibility ? 1 : 0;
        }
      }
    } else {
      visibilities.fill(meta.points.pointVisibility ? 1 : 0);
    }
    return visibilities;
  }

  private async _loadPointOpacities(
    meta: PointsMeta,
    opacityMaps: Map<string, Map<string, number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const opacities = new Uint8Array(meta.data.getLength());
    const baseOpacity =
      (meta.layer.opacity ?? 1.0) * (meta.points.opacity ?? 1.0);
    if (meta.points.pointOpacity === undefined) {
      opacities.fill(
        Math.round(
          baseOpacity * WebGLPointsController._DEFAULT_POINT_OPACITY * 255,
        ),
      );
    } else if (isTableValuesColumn(meta.points.pointOpacity)) {
      const tableData = await loadTableByID(
        meta.points.pointOpacity.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        meta.points.pointOpacity.valuesCol,
        signal,
      );
      signal?.throwIfAborted();
      for (let i = 0; i < tableValues.length; i++) {
        opacities[i] = Math.round(baseOpacity * tableValues[i]! * 255);
      }
    } else if (isTableGroupsColumn(meta.points.pointOpacity)) {
      const tableData = await loadTableByID(
        meta.points.pointOpacity.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(
        meta.points.pointOpacity.groupsCol,
        signal,
      );
      signal?.throwIfAborted();
      let opacityMap = undefined;
      if (meta.points.opacityMap !== undefined) {
        if (typeof meta.points.opacityMap === "string") {
          opacityMap = opacityMaps.get(meta.points.opacityMap);
        } else {
          opacityMap = new Map(Object.entries(meta.points.opacityMap));
        }
      }
      if (opacityMap !== undefined) {
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const opacity =
            opacityMap.get(group) ??
            WebGLPointsController._DEFAULT_POINT_OPACITY;
          opacities[i] = Math.round(baseOpacity * opacity * 255);
        }
      } else {
        for (let i = 0; i < tableGroups.length; i++) {
          const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
          const opacity =
            WebGLPointsController._DEFAULT_POINT_OPACITIES[
              hash % WebGLPointsController._DEFAULT_POINT_OPACITIES.length
            ]!;
          opacities[i] = Math.round(baseOpacity * opacity * 255);
        }
      }
    } else {
      opacities.fill(Math.round(baseOpacity * meta.points.pointOpacity * 255));
    }
    return opacities;
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
  nPoints: number;
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
