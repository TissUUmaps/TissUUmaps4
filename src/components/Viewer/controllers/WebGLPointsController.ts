import { mat3 } from "gl-matrix";

import { PointsData } from "../../../data/points";
import { TableData } from "../../../data/table";
import { Layer } from "../../../model/layer";
import {
  DEFAULT_POINT_COLOR,
  DEFAULT_POINT_COLORS,
  DEFAULT_POINT_MARKER,
  DEFAULT_POINT_MARKERS,
  DEFAULT_POINT_OPACITIES,
  DEFAULT_POINT_OPACITY,
  DEFAULT_POINT_SIZE,
  DEFAULT_POINT_SIZES,
  DEFAULT_POINT_VISIBILITIES,
  DEFAULT_POINT_VISIBILITY,
  Points,
  PointsLayerConfig,
  RawPointsLayerConfig,
  createPointsLayerConfig,
} from "../../../model/points";
import {
  Color,
  DrawOptions,
  Marker,
  PropertyMap,
  Rect,
  isTableGroupsColumn,
  isTableValuesColumn,
} from "../../../types";
import ColorUtils from "../../../utils/ColorUtils";
import HashUtils from "../../../utils/HashUtils";
import TransformUtils from "../../../utils/TransformUtils";
import WebGLUtils from "../../../utils/WebGLUtils";
import markersUrl from "../assets/markers/markers.png?url";
import pointsFragmentShader from "../assets/shaders/points.frag?raw";
import pointsVertexShader from "../assets/shaders/points.vert?raw";
import WebGLControllerBase from "./WebGLControllerBase";

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
    OBJECTS_UBO: 0,
  };

  private readonly _program: WebGLProgram;
  private readonly _uniformLocations: {
    worldToViewportMatrix: WebGLUniformLocation;
    pointSizeFactor: WebGLUniformLocation;
    markerAtlas: WebGLUniformLocation;
  };
  private readonly _uniformBlockIndices: {
    objectsUBO: number;
  };
  private readonly _buffers: {
    x: WebGLBuffer;
    y: WebGLBuffer;
    size: WebGLBuffer;
    color: WebGLBuffer;
    markerIndex: WebGLBuffer;
    objectIndex: WebGLBuffer;
    objectsUBO: WebGLBuffer;
  };
  private readonly _vao: WebGLVertexArrayObject;
  private _markerAtlasTexture: WebGLTexture | undefined;
  private _bufferSlices: PointsBufferSlice[] = [];
  private _nPoints: number = 0;

  constructor(gl: WebGL2RenderingContext) {
    super(gl);
    // load program
    this._program = WebGLUtils.loadProgram(
      this._gl,
      pointsVertexShader,
      pointsFragmentShader,
    );
    // get uniform locations and block indices
    this._uniformLocations = {
      worldToViewportMatrix: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_worldToViewportMatrix",
      ),
      pointSizeFactor: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_pointSizeFactor",
      ),
      markerAtlas: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_markerAtlas",
      ),
    };
    this._uniformBlockIndices = {
      objectsUBO: this._gl.getUniformBlockIndex(this._program, "ObjectsUBO"),
    };
    // create buffers and allocate space for UBO
    this._buffers = {
      x: WebGLUtils.createBuffer(this._gl),
      y: WebGLUtils.createBuffer(this._gl),
      size: WebGLUtils.createBuffer(this._gl),
      color: WebGLUtils.createBuffer(this._gl),
      markerIndex: WebGLUtils.createBuffer(this._gl),
      objectIndex: WebGLUtils.createBuffer(this._gl),
      objectsUBO: WebGLUtils.createBuffer(this._gl),
    };
    WebGLUtils.resizeBuffer(
      this._gl,
      this._buffers.objectsUBO,
      WebGLPointsController._MAX_N_OBJECTS * 8 * Float32Array.BYTES_PER_ELEMENT,
      gl.UNIFORM_BUFFER,
      gl.DYNAMIC_DRAW,
    );
    // create and configure VAO
    this._vao = WebGLUtils.createVertexArray(this._gl);
    this._gl.bindVertexArray(this._vao);
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
  }

  async initialize(signal?: AbortSignal): Promise<WebGLPointsController> {
    signal?.throwIfAborted();
    this._markerAtlasTexture = await WebGLUtils.loadTexture(
      this._gl,
      markersUrl,
      signal,
    );
    signal?.throwIfAborted();
    return this;
  }

  async synchronize(
    layerMap: Map<string, Layer>,
    pointsMap: Map<string, Points>,
    sizeMaps: Map<string, PropertyMap<number>>,
    colorMaps: Map<string, PropertyMap<Color>>,
    visibilityMaps: Map<string, PropertyMap<boolean>>,
    opacityMaps: Map<string, PropertyMap<number>>,
    markerMaps: Map<string, PropertyMap<Marker>>,
    loadPoints: (points: Points, signal?: AbortSignal) => Promise<PointsData>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    const refs = await this._collectPoints(
      layerMap,
      pointsMap,
      loadPoints,
      signal,
    );
    signal?.throwIfAborted();
    if (refs.length > WebGLPointsController._MAX_N_OBJECTS) {
      console.warn(
        `Only rendering the first ${WebGLPointsController._MAX_N_OBJECTS} out of ${refs.length} objects`,
      );
      refs.length = WebGLPointsController._MAX_N_OBJECTS;
    }
    let buffersResized = false;
    const nPoints = refs.reduce((s, ref) => s + ref.data.getLength(), 0);
    if (this._nPoints !== nPoints) {
      this._resizeBuffers(nPoints);
      buffersResized = true;
    }
    const newBufferSlices = await this._loadPoints(
      refs,
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

  draw(viewport: Rect, drawOptions: DrawOptions): void {
    if (this._nPoints === 0 || this._markerAtlasTexture === undefined) {
      return;
    }
    this._gl.useProgram(this._program);
    this._gl.bindVertexArray(this._vao);
    this._gl.bindBufferBase(
      this._gl.UNIFORM_BUFFER,
      WebGLPointsController._BINDING_POINTS.OBJECTS_UBO,
      this._buffers.objectsUBO,
    );
    this._gl.uniformBlockBinding(
      this._program,
      this._uniformBlockIndices.objectsUBO,
      WebGLPointsController._BINDING_POINTS.OBJECTS_UBO,
    );
    const worldToViewportMatrix =
      WebGLPointsController.createWorldToViewportMatrix(viewport);
    // gl-matrix, like OpenGL, uses column-major order.
    // In OpenGL, mat3x2 has three columns and two rows.
    const worldToViewportMatrixAsGLMat3x2 = [
      worldToViewportMatrix[0],
      worldToViewportMatrix[1],
      worldToViewportMatrix[3],
      worldToViewportMatrix[4],
      worldToViewportMatrix[6],
      worldToViewportMatrix[7],
    ];
    this._gl.uniformMatrix3x2fv(
      this._uniformLocations.worldToViewportMatrix,
      false,
      worldToViewportMatrixAsGLMat3x2,
    );
    this._gl.uniform1f(
      this._uniformLocations.pointSizeFactor,
      drawOptions.pointSizeFactor * // global (world) scale factor
        (1 / viewport.width) * // scale to viewport space (in [0, 1])
        this._gl.canvas.width * // scale viewport space to browser pixels
        window.devicePixelRatio, // scale browser pixels to device pixels
    );
    this._gl.activeTexture(this._gl.TEXTURE0);
    this._gl.bindTexture(this._gl.TEXTURE_2D, this._markerAtlasTexture);
    this._gl.uniform1i(this._uniformLocations.markerAtlas, 0);
    this._gl.enable(this._gl.BLEND);
    // alpha blending / over operator (Porter & Duff)
    // https://en.wikipedia.org/wiki/Alpha_compositing
    // https://learnopengl.com/Advanced-OpenGL/Blending
    // https://www.khronos.org/opengl/wiki/Blending
    // https://www.realtimerendering.com/blog/gpus-prefer-premultiplication/
    this._gl.blendEquation(this._gl.FUNC_ADD);
    this._gl.blendFuncSeparate(
      this._gl.ONE, // alpha is premultiplied in fragment shader
      this._gl.ONE_MINUS_SRC_ALPHA,
      this._gl.ONE,
      this._gl.ONE_MINUS_SRC_ALPHA,
    );
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
      nPoints * Float32Array.BYTES_PER_ELEMENT,
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
    layerMap: Map<string, Layer>,
    pointsMap: Map<string, Points>,
    loadPoints: (points: Points, signal?: AbortSignal) => Promise<PointsData>,
    signal?: AbortSignal,
  ): Promise<PointsRef[]> {
    signal?.throwIfAborted();
    const refs: PointsRef[] = [];
    for (const layer of layerMap.values()) {
      for (const points of pointsMap.values()) {
        for (const rawLayerConfig of points.layerConfigs.filter(
          (rawLayerConfig) => rawLayerConfig.layerId === layer.id,
        )) {
          let data = null;
          try {
            data = await loadPoints(points, signal);
          } catch (error) {
            if (!signal?.aborted) {
              console.error(
                `Failed to load points with ID '${points.id}'`,
                error,
              );
            }
          }
          signal?.throwIfAborted();
          if (data !== null) {
            refs.push({
              layer: layer,
              points: points,
              rawLayerConfig: rawLayerConfig,
              layerConfig: createPointsLayerConfig(rawLayerConfig),
              data: data,
            });
          }
        }
      }
    }
    return refs;
  }

  private async _loadPoints(
    refs: PointsRef[],
    sizeMaps: Map<string, PropertyMap<number>>,
    colorMaps: Map<string, PropertyMap<Color>>,
    visibilityMaps: Map<string, PropertyMap<boolean>>,
    opacityMaps: Map<string, PropertyMap<number>>,
    markerMaps: Map<string, PropertyMap<Marker>>,
    buffersResized: boolean,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<PointsBufferSlice[]> {
    signal?.throwIfAborted();
    let i = 0;
    let offset = 0;
    const newBufferSlices: PointsBufferSlice[] = [];
    const objectsUBOData = new Float32Array(
      WebGLPointsController._MAX_N_OBJECTS * 8,
    );
    for (const ref of refs) {
      const nPoints = ref.data.getLength();
      const bufferSlice = this._bufferSlices[i];
      const bufferSliceChanged =
        buffersResized ||
        bufferSlice === undefined ||
        bufferSlice.nPoints !== nPoints ||
        bufferSlice.offset !== offset ||
        bufferSlice.ref.layer !== ref.layer ||
        bufferSlice.ref.points !== ref.points ||
        bufferSlice.ref.rawLayerConfig !== ref.rawLayerConfig ||
        bufferSlice.ref.data !== ref.data;
      if (
        bufferSliceChanged ||
        bufferSlice.current.layerConfig.x !== ref.layerConfig.x
      ) {
        const data = await ref.data.loadCoordinates(ref.layerConfig.x, signal);
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(this._gl, this._buffers.x, data, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.current.layerConfig.y !== ref.layerConfig.y
      ) {
        const data = await ref.data.loadCoordinates(ref.layerConfig.y, signal);
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(this._gl, this._buffers.y, data, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.current.layer.pointSizeFactor !==
          ref.layer.pointSizeFactor ||
        bufferSlice.current.layer.transform.scale !==
          ref.layer.transform.scale ||
        bufferSlice.current.points.pointSize !== ref.points.pointSize ||
        bufferSlice.current.points.pointSizeUnit !== ref.points.pointSizeUnit ||
        bufferSlice.current.points.pointSizeFactor !==
          ref.points.pointSizeFactor ||
        bufferSlice.current.points.sizeMap !== ref.points.sizeMap ||
        bufferSlice.current.layerConfig.transform.scale !==
          ref.layerConfig.transform.scale
      ) {
        const data = await this._loadPointSizes(
          ref,
          sizeMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(this._gl, this._buffers.size, data, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.current.layer.visibility !== ref.layer.visibility ||
        bufferSlice.current.layer.opacity !== ref.layer.opacity ||
        bufferSlice.current.points.visibility !== ref.points.visibility ||
        bufferSlice.current.points.opacity !== ref.points.opacity ||
        bufferSlice.current.points.pointVisibility !==
          ref.points.pointVisibility ||
        bufferSlice.current.points.visibilityMap !== ref.points.visibilityMap ||
        bufferSlice.current.points.pointOpacity !== ref.points.pointOpacity ||
        bufferSlice.current.points.opacityMap !== ref.points.opacityMap ||
        bufferSlice.current.points.pointColor !== ref.points.pointColor ||
        bufferSlice.current.points.colorMap !== ref.points.colorMap
      ) {
        const data = await this._loadPointColors(
          ref,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(this._gl, this._buffers.color, data, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.current.points.pointMarker !== ref.points.pointMarker ||
        bufferSlice.current.points.markerMap !== ref.points.markerMap
      ) {
        const data = await this._loadPointMarkerIndices(
          ref,
          markerMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this._gl,
          this._buffers.markerIndex,
          data,
          offset,
        );
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
        ref: ref,
        offset: offset,
        nPoints: nPoints,
        current: {
          layer: {
            visibility: ref.layer.visibility,
            opacity: ref.layer.opacity,
            pointSizeFactor: ref.layer.pointSizeFactor,
            transform: ref.layer.transform,
          },
          points: {
            visibility: ref.points.visibility,
            opacity: ref.points.opacity,
            pointSize: ref.points.pointSize,
            pointSizeUnit: ref.points.pointSizeUnit,
            pointSizeFactor: ref.points.pointSizeFactor,
            sizeMap: ref.points.sizeMap,
            pointColor: ref.points.pointColor,
            colorMap: ref.points.colorMap,
            pointVisibility: ref.points.pointVisibility,
            visibilityMap: ref.points.visibilityMap,
            pointOpacity: ref.points.pointOpacity,
            opacityMap: ref.points.opacityMap,
            pointMarker: ref.points.pointMarker,
            markerMap: ref.points.markerMap,
          },
          layerConfig: {
            x: ref.layerConfig.x,
            y: ref.layerConfig.y,
            transform: ref.layerConfig.transform,
          },
        },
      });
      const m = mat3.create();
      if (ref.layerConfig.flip) {
        const flipMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
        mat3.multiply(m, flipMatrix, m);
      }
      const dataToLayerMatrix = TransformUtils.toMatrix(
        ref.layerConfig.transform,
      );
      mat3.multiply(m, dataToLayerMatrix, m);
      const layerToWorldMatrix = TransformUtils.toMatrix(ref.layer.transform);
      mat3.multiply(m, layerToWorldMatrix, m);
      // gl-matrix, like OpenGL, uses column-major order.
      // In OpenGL, mat2x4 has two columns and four rows.
      const transposedDataToWorldMatrixAsGLMat2x4 = [
        m[0],
        m[3],
        m[6],
        0,
        m[1],
        m[4],
        m[7],
        0,
      ];
      objectsUBOData.set(transposedDataToWorldMatrixAsGLMat2x4, i * 8);
      offset += nPoints;
      i++;
    }
    WebGLUtils.loadBuffer(this._gl, this._buffers.objectsUBO, objectsUBOData);
    return newBufferSlices;
  }

  private async _loadPointSizes(
    ref: PointsRef,
    sizeMaps: Map<string, PropertyMap<number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Float32Array> {
    signal?.throwIfAborted();
    const data = new Float32Array(ref.data.getLength());
    let sizeFactor = ref.points.pointSizeFactor * ref.layer.pointSizeFactor;
    if (ref.points.pointSizeUnit === "data") {
      sizeFactor *= ref.layerConfig.transform.scale;
    }
    if (
      ref.points.pointSizeUnit === "data" ||
      ref.points.pointSizeUnit === "layer"
    ) {
      sizeFactor *= ref.layer.transform.scale;
    }
    if (isTableValuesColumn(ref.points.pointSize)) {
      const tableData = await loadTableByID(
        ref.points.pointSize.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        ref.points.pointSize.valuesCol,
        signal,
      );
      signal?.throwIfAborted();
      for (let i = 0; i < tableValues.length; i++) {
        data[i] = tableValues[i]! * sizeFactor;
      }
    } else if (isTableGroupsColumn(ref.points.pointSize)) {
      const tableData = await loadTableByID(
        ref.points.pointSize.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(
        ref.points.pointSize.groupsCol,
        signal,
      );
      signal?.throwIfAborted();
      let sizeMap = undefined;
      if (ref.points.sizeMap !== undefined) {
        if (typeof ref.points.sizeMap === "string") {
          const propertyMap = sizeMaps.get(ref.points.sizeMap);
          if (propertyMap !== undefined) {
            sizeMap = new Map(Object.entries(propertyMap.values));
          }
        } else {
          sizeMap = new Map(Object.entries(ref.points.sizeMap));
        }
      }
      if (sizeMap !== undefined) {
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          let value = sizeMap.get(group);
          if (value === undefined) {
            console.warn(
              `No point size mapping found for group ${group}, using default point size`,
            );
            value = DEFAULT_POINT_SIZE;
          }
          data[i] = value * sizeFactor;
        }
      } else {
        console.warn("No point size map found, using default point sizes");
        for (let i = 0; i < tableGroups.length; i++) {
          const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
          const value = DEFAULT_POINT_SIZES[hash % DEFAULT_POINT_SIZES.length]!;
          data[i] = value * sizeFactor;
        }
      }
    } else {
      data.fill(ref.points.pointSize * sizeFactor);
    }
    return data;
  }

  private async _loadPointColors(
    ref: PointsRef,
    colorMaps: Map<string, PropertyMap<Color>>,
    visibilityMaps: Map<string, PropertyMap<boolean>>,
    opacityMaps: Map<string, PropertyMap<number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Uint32Array> {
    signal?.throwIfAborted();
    const data = new Uint32Array(ref.data.getLength());
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.points.visibility === false ||
      ref.points.opacity === 0
    ) {
      data.fill(0);
    } else {
      if (isTableValuesColumn(ref.points.pointColor)) {
        const tableData = await loadTableByID(
          ref.points.pointColor.tableId,
          signal,
        );
        signal?.throwIfAborted();
        const tableValues = await tableData.loadColumn<string>(
          ref.points.pointColor.valuesCol,
          signal,
        );
        signal?.throwIfAborted();
        for (let i = 0; i < tableValues.length; i++) {
          data[i] = ColorUtils.packColor(
            ColorUtils.parseColor(tableValues[i]!),
          );
        }
      } else if (isTableGroupsColumn(ref.points.pointColor)) {
        const tableData = await loadTableByID(
          ref.points.pointColor.tableId,
          signal,
        );
        signal?.throwIfAborted();
        const tableGroups = await tableData.loadColumn(
          ref.points.pointColor.groupsCol,
          signal,
        );
        signal?.throwIfAborted();
        let colorMap = undefined;
        if (ref.points.colorMap !== undefined) {
          if (typeof ref.points.colorMap === "string") {
            const propertyMap = colorMaps.get(ref.points.colorMap);
            if (propertyMap !== undefined) {
              colorMap = new Map(Object.entries(propertyMap.values));
            }
          } else {
            colorMap = new Map(Object.entries(ref.points.colorMap));
          }
        }
        if (colorMap !== undefined) {
          for (let i = 0; i < tableGroups.length; i++) {
            const group = JSON.stringify(tableGroups[i]!);
            let value = colorMap.get(group);
            if (value === undefined) {
              console.warn(
                `No point color mapping found for group ${group}, using default point color`,
              );
              value = DEFAULT_POINT_COLOR;
            }
            data[i] = ColorUtils.packColor(value);
          }
        } else {
          console.warn("No point color map found, using default point colors");
          for (let i = 0; i < tableGroups.length; i++) {
            const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
            const value =
              DEFAULT_POINT_COLORS[hash % DEFAULT_POINT_COLORS.length]!;
            data[i] = ColorUtils.packColor(value);
          }
        }
      } else {
        data.fill(ColorUtils.packColor(ref.points.pointColor));
      }
      const visibilityData = await this._loadPointVisibilities(
        ref,
        visibilityMaps,
        loadTableByID,
        signal,
      );
      signal?.throwIfAborted();
      const opacityData = await this._loadPointOpacities(
        ref,
        opacityMaps,
        loadTableByID,
        signal,
      );
      signal?.throwIfAborted();
      for (let i = 0; i < data.length; i++) {
        data[i] =
          (data[i]! << 8) + (visibilityData[i]! > 0 ? opacityData[i]! : 0);
      }
    }
    return data;
  }

  private async _loadPointMarkerIndices(
    ref: PointsRef,
    markerMaps: Map<string, PropertyMap<Marker>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const data = new Uint8Array(ref.data.getLength());
    if (isTableValuesColumn(ref.points.pointMarker)) {
      const tableData = await loadTableByID(
        ref.points.pointMarker.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<string>(
        ref.points.pointMarker.valuesCol,
        signal,
      );
      signal?.throwIfAborted();
      for (let i = 0; i < tableValues.length; i++) {
        data[i] = Marker[tableValues[i]! as keyof typeof Marker];
      }
    } else if (isTableGroupsColumn(ref.points.pointMarker)) {
      const tableData = await loadTableByID(
        ref.points.pointMarker.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(
        ref.points.pointMarker.groupsCol,
        signal,
      );
      signal?.throwIfAborted();
      let markerMap = undefined;
      if (ref.points.markerMap !== undefined) {
        if (typeof ref.points.markerMap === "string") {
          const propertyMap = markerMaps.get(ref.points.markerMap);
          if (propertyMap !== undefined) {
            markerMap = new Map(Object.entries(propertyMap.values));
          }
        } else {
          markerMap = new Map(Object.entries(ref.points.markerMap));
        }
      }
      if (markerMap !== undefined) {
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          let value = markerMap.get(group);
          if (value === undefined) {
            console.warn(
              `No point marker mapping found for group ${group}, using default point marker`,
            );
            value = DEFAULT_POINT_MARKER;
          }
          data[i] = value;
        }
      } else {
        console.warn("No point marker map found, using default point markers");
        for (let i = 0; i < tableGroups.length; i++) {
          const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
          data[i] = DEFAULT_POINT_MARKERS[hash % DEFAULT_POINT_MARKERS.length]!;
        }
      }
    } else {
      data.fill(ref.points.pointMarker);
    }
    return data;
  }

  private async _loadPointVisibilities(
    ref: PointsRef,
    visibilityMaps: Map<string, PropertyMap<boolean>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const data = new Uint8Array(ref.data.getLength());
    if (isTableValuesColumn(ref.points.pointVisibility)) {
      const tableData = await loadTableByID(
        ref.points.pointVisibility.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        ref.points.pointVisibility.valuesCol,
        signal,
      );
      signal?.throwIfAborted();
      data.set(tableValues);
    } else if (isTableGroupsColumn(ref.points.pointVisibility)) {
      const tableData = await loadTableByID(
        ref.points.pointVisibility.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(
        ref.points.pointVisibility.groupsCol,
        signal,
      );
      signal?.throwIfAborted();
      let visibilityMap = undefined;
      if (ref.points.visibilityMap !== undefined) {
        if (typeof ref.points.visibilityMap === "string") {
          const propertyMap = visibilityMaps.get(ref.points.visibilityMap);
          if (propertyMap !== undefined) {
            visibilityMap = new Map(Object.entries(propertyMap.values));
          }
        } else {
          visibilityMap = new Map(Object.entries(ref.points.visibilityMap));
        }
      }
      if (visibilityMap !== undefined) {
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          let value = visibilityMap.get(group);
          if (value === undefined) {
            console.warn(
              `No point visibility mapping found for group ${group}, using default point visibility`,
            );
            value = DEFAULT_POINT_VISIBILITY;
          }
          data[i] = value ? 1 : 0;
        }
      } else {
        console.warn(
          "No point visibility map found, using default point visibilities",
        );
        for (let i = 0; i < tableGroups.length; i++) {
          const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
          const value =
            DEFAULT_POINT_VISIBILITIES[
              hash % DEFAULT_POINT_VISIBILITIES.length
            ]!;
          data[i] = value ? 1 : 0;
        }
      }
    } else {
      data.fill(ref.points.pointVisibility ? 1 : 0);
    }
    return data;
  }

  private async _loadPointOpacities(
    ref: PointsRef,
    opacityMaps: Map<string, PropertyMap<number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const data = new Uint8Array(ref.data.getLength());
    const baseOpacity = ref.layer.opacity * ref.points.opacity;
    if (isTableValuesColumn(ref.points.pointOpacity)) {
      const tableData = await loadTableByID(
        ref.points.pointOpacity.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableValues = await tableData.loadColumn<number>(
        ref.points.pointOpacity.valuesCol,
        signal,
      );
      signal?.throwIfAborted();
      for (let i = 0; i < tableValues.length; i++) {
        data[i] = Math.round(baseOpacity * tableValues[i]! * 255);
      }
    } else if (isTableGroupsColumn(ref.points.pointOpacity)) {
      const tableData = await loadTableByID(
        ref.points.pointOpacity.tableId,
        signal,
      );
      signal?.throwIfAborted();
      const tableGroups = await tableData.loadColumn(
        ref.points.pointOpacity.groupsCol,
        signal,
      );
      signal?.throwIfAborted();
      let opacityMap = undefined;
      if (ref.points.opacityMap !== undefined) {
        if (typeof ref.points.opacityMap === "string") {
          const propertyMap = opacityMaps.get(ref.points.opacityMap);
          if (propertyMap !== undefined) {
            opacityMap = new Map(Object.entries(propertyMap.values));
          }
        } else {
          opacityMap = new Map(Object.entries(ref.points.opacityMap));
        }
      }
      if (opacityMap !== undefined) {
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          let value = opacityMap.get(group);
          if (value === undefined) {
            console.warn(
              `No point opacity mapping found for group ${group}, using default point opacity`,
            );
            value = DEFAULT_POINT_OPACITY;
          }
          data[i] = Math.round(baseOpacity * value * 255);
        }
      } else {
        console.warn(
          "No point opacity map found, using default point opacities",
        );
        for (let i = 0; i < tableGroups.length; i++) {
          const hash = HashUtils.djb2(JSON.stringify(tableGroups[i]!));
          const value =
            DEFAULT_POINT_OPACITIES[hash % DEFAULT_POINT_OPACITIES.length]!;
          data[i] = Math.round(baseOpacity * value * 255);
        }
      }
    } else {
      data.fill(Math.round(baseOpacity * ref.points.pointOpacity * 255));
    }
    return data;
  }
}

type PointsRef = {
  layer: Layer;
  points: Points;
  rawLayerConfig: RawPointsLayerConfig;
  layerConfig: PointsLayerConfig;
  data: PointsData;
};

type PointsBufferSlice = {
  ref: PointsRef;
  offset: number;
  nPoints: number;
  current: {
    layer: Pick<
      Layer,
      "visibility" | "opacity" | "pointSizeFactor" | "transform"
    >;
    points: Pick<
      Points,
      | "visibility"
      | "opacity"
      | "pointSize"
      | "pointSizeUnit"
      | "pointSizeFactor"
      | "sizeMap"
      | "pointColor"
      | "colorMap"
      | "pointVisibility"
      | "visibilityMap"
      | "pointOpacity"
      | "opacityMap"
      | "pointMarker"
      | "markerMap"
    >;
    layerConfig: Pick<PointsLayerConfig, "x" | "y" | "transform">;
  };
};
