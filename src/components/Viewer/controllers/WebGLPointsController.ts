import markersUrl from "../../../assets/markers/markers.png?url";
import pointsFragmentShader from "../../../assets/shaders/points.frag?raw";
import pointsVertexShader from "../../../assets/shaders/points.vert?raw";
import { PointsData } from "../../../data/points";
import { TableData } from "../../../data/table";
import { CompleteLayer } from "../../../model/layer";
import {
  CompletePoints,
  CompletePointsLayerConfig,
  DEFAULT_POINT_COLOR,
  DEFAULT_POINT_MARKER,
  DEFAULT_POINT_OPACITY,
  DEFAULT_POINT_SIZE,
  DEFAULT_POINT_VISIBILITY,
  PointsLayerConfig,
  completePointsLayerConfig,
} from "../../../model/points";
import { COLOR_PALETTES, MARKER_PALETTE } from "../../../palettes";
import {
  ColorMap,
  DrawOptions,
  Marker,
  Rect,
  ValueMap,
  isTableGroupsColumn,
  isTableValuesColumn,
} from "../../../types";
import ColorUtils from "../../../utils/ColorUtils";
import HashUtils from "../../../utils/HashUtils";
import TransformUtils from "../../../utils/TransformUtils";
import WebGLUtils from "../../../utils/WebGLUtils";
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
    // get uniform locations
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
    // get block indices
    this._uniformBlockIndices = {
      objectsUBO: this._gl.getUniformBlockIndex(this._program, "ObjectsUBO"),
    };
    // create buffers and allocate space for UBOs
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
    layerMap: Map<string, CompleteLayer>,
    pointsMap: Map<string, CompletePoints>,
    markerMaps: Map<string, ValueMap<Marker>>,
    sizeMaps: Map<string, ValueMap<number>>,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    loadPoints: (
      points: CompletePoints,
      signal?: AbortSignal,
    ) => Promise<PointsData>,
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
      markerMaps,
      sizeMaps,
      colorMaps,
      visibilityMaps,
      opacityMaps,
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
    this._gl.uniformMatrix3x2fv(
      this._uniformLocations.worldToViewportMatrix,
      false,
      TransformUtils.asGLMat3x2(
        WebGLPointsController.createWorldToViewportMatrix(viewport),
      ),
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
    WebGLUtils.enableAlphaBlending(this._gl);
    this._gl.drawArrays(this._gl.POINTS, 0, this._nPoints);
    WebGLUtils.disableAlphaBlending(this._gl);
    this._gl.bindVertexArray(null);
    this._gl.useProgram(null);
  }

  destroy(): void {
    this._gl.deleteProgram(this._program);
    this._gl.deleteVertexArray(this._vao);
    if (this._markerAtlasTexture !== undefined) {
      this._gl.deleteTexture(this._markerAtlasTexture);
    }
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
    layerMap: Map<string, CompleteLayer>,
    pointsMap: Map<string, CompletePoints>,
    loadPoints: (
      points: CompletePoints,
      signal?: AbortSignal,
    ) => Promise<PointsData>,
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
              layerConfig: completePointsLayerConfig(rawLayerConfig),
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
    markerMaps: Map<string, ValueMap<Marker>>,
    sizeMaps: Map<string, ValueMap<number>>,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
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
        bufferSlice.current.points.pointMarker !== ref.points.pointMarker ||
        bufferSlice.current.points.pointMarkerMap !== ref.points.pointMarkerMap
        // TODO react to changes in marker maps
      ) {
        const markerIndexData = await this._loadPointMarkerIndexData(
          ref,
          markerMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this._gl,
          this._buffers.markerIndex,
          markerIndexData,
          offset,
        );
      }
      if (
        bufferSliceChanged ||
        bufferSlice.current.layer.transform.scale !==
          ref.layer.transform.scale ||
        bufferSlice.current.layer.pointSizeFactor !==
          ref.layer.pointSizeFactor ||
        bufferSlice.current.points.pointSize !== ref.points.pointSize ||
        bufferSlice.current.points.pointSizeMap !== ref.points.pointSizeMap ||
        bufferSlice.current.points.pointSizeUnit !== ref.points.pointSizeUnit ||
        bufferSlice.current.points.pointSizeFactor !==
          ref.points.pointSizeFactor ||
        bufferSlice.current.layerConfig.transform.scale !==
          ref.layerConfig.transform.scale
        // TODO react to changes in size maps
      ) {
        const sizeData = await this._loadPointSizeData(
          ref,
          sizeMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(this._gl, this._buffers.size, sizeData, offset);
      }
      if (
        bufferSliceChanged ||
        bufferSlice.current.layer.visibility !== ref.layer.visibility ||
        bufferSlice.current.layer.opacity !== ref.layer.opacity ||
        bufferSlice.current.points.visibility !== ref.points.visibility ||
        bufferSlice.current.points.opacity !== ref.points.opacity ||
        bufferSlice.current.points.pointVisibility !==
          ref.points.pointVisibility ||
        bufferSlice.current.points.pointVisibilityMap !==
          ref.points.pointVisibilityMap ||
        bufferSlice.current.points.pointOpacity !== ref.points.pointOpacity ||
        bufferSlice.current.points.pointOpacityMap !==
          ref.points.pointOpacityMap ||
        bufferSlice.current.points.pointColor !== ref.points.pointColor ||
        bufferSlice.current.points.pointColorRange !==
          ref.points.pointColorRange ||
        bufferSlice.current.points.pointColorPalette !==
          ref.points.pointColorPalette ||
        bufferSlice.current.points.pointColorMap !== ref.points.pointColorMap
        // TODO react to changes in color, visibility, and opacity maps
      ) {
        const colorData = await this._loadPointColorData(
          ref,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTableByID,
          signal,
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(this._gl, this._buffers.color, colorData, offset);
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
            pointMarker: ref.points.pointMarker,
            pointMarkerMap: ref.points.pointMarkerMap,
            pointSize: ref.points.pointSize,
            pointSizeMap: ref.points.pointSizeMap,
            pointSizeUnit: ref.points.pointSizeUnit,
            pointSizeFactor: ref.points.pointSizeFactor,
            pointColor: ref.points.pointColor,
            pointColorRange: ref.points.pointColorRange,
            pointColorPalette: ref.points.pointColorPalette,
            pointColorMap: ref.points.pointColorMap,
            pointVisibility: ref.points.pointVisibility,
            pointVisibilityMap: ref.points.pointVisibilityMap,
            pointOpacity: ref.points.pointOpacity,
            pointOpacityMap: ref.points.pointOpacityMap,
          },
          layerConfig: {
            x: ref.layerConfig.x,
            y: ref.layerConfig.y,
            transform: ref.layerConfig.transform,
          },
        },
      });
      objectsUBOData.set(
        TransformUtils.transposeAsGLMat2x4(
          WebGLPointsController.createDataToWorldMatrix(
            ref.layer,
            ref.layerConfig,
          ),
        ),
        i * 8,
      );
      offset += nPoints;
      i++;
    }
    WebGLUtils.loadBuffer(this._gl, this._buffers.objectsUBO, objectsUBOData);
    return newBufferSlices;
  }

  private async _loadPointMarkerIndexData(
    ref: PointsRef,
    markerMaps: Map<string, ValueMap<Marker>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const data = new Uint8Array(ref.data.getLength());
    if (isTableValuesColumn(ref.points.pointMarker)) {
      // table column contains marker values
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
      // table column contains group names
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
      let markerMap;
      if (ref.points.pointMarkerMap !== undefined) {
        markerMap =
          typeof ref.points.pointMarkerMap === "string"
            ? markerMaps.get(ref.points.pointMarkerMap)
            : ref.points.pointMarkerMap;
      }
      if (markerMap !== undefined) {
        // marker map found, map group names to markers
        const groupValues = new Map(Object.entries(markerMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const value =
            groupValues.get(group) ?? // first, try to get group-specific marker
            markerMap.defaultValue ?? // then, fallback to marker map default
            DEFAULT_POINT_MARKER; // finally, fallback to default marker
          data[i] = value;
        }
      } else {
        // no marker map found, fallback to marker palette
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const markerIndex = HashUtils.djb2(group) % MARKER_PALETTE.length;
          data[i] = MARKER_PALETTE[markerIndex]!;
        }
      }
    } else if (ref.points.pointMarker === "random") {
      // random markers from marker palette
      for (let i = 0; i < data.length; i++) {
        const markerIndex = Math.floor(Math.random() * MARKER_PALETTE.length);
        data[i] = MARKER_PALETTE[markerIndex]!;
      }
    } else {
      // uniform marker for all points
      data.fill(ref.points.pointMarker);
    }
    return data;
  }

  private async _loadPointSizeData(
    ref: PointsRef,
    sizeMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Float32Array> {
    signal?.throwIfAborted();
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
    const data = new Float32Array(ref.data.getLength());
    if (isTableValuesColumn(ref.points.pointSize)) {
      // table column contains size values
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
      // table column contains group names
      let sizeMap = undefined;
      if (ref.points.pointSizeMap !== undefined) {
        sizeMap =
          typeof ref.points.pointSizeMap === "string"
            ? sizeMaps.get(ref.points.pointSizeMap)
            : ref.points.pointSizeMap;
      }
      if (sizeMap !== undefined) {
        // size map found, load group names
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
        // map group names to sizes
        const groupValues = new Map(Object.entries(sizeMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const value =
            groupValues.get(group) ?? // first, try to get group-specific size
            sizeMap.defaultValue ?? // then, fallback to size map default
            DEFAULT_POINT_SIZE; // finally, fallback to default size
          data[i] = value * sizeFactor;
        }
      } else {
        // no size map found, fallback to default size
        data.fill(DEFAULT_POINT_SIZE * sizeFactor);
      }
    } else {
      // uniform size for all points
      data.fill(ref.points.pointSize * sizeFactor);
    }
    return data;
  }

  private async _loadPointColorData(
    ref: PointsRef,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Uint32Array> {
    signal?.throwIfAborted();
    // check if points are visible at all
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.points.visibility === false ||
      ref.points.opacity === 0
    ) {
      return new Uint32Array(ref.data.getLength()).fill(0);
    }
    const data = new Uint32Array(ref.data.getLength());
    if (isTableValuesColumn(ref.points.pointColor)) {
      // table column contains continuous values
      const palette =
        ref.points.pointColorPalette !== undefined
          ? COLOR_PALETTES[ref.points.pointColorPalette]
          : undefined;
      if (palette !== undefined) {
        // color palette found, load values
        const tableData = await loadTableByID(
          ref.points.pointColor.tableId,
          signal,
        );
        signal?.throwIfAborted();
        const tableValues = await tableData.loadColumn<number>(
          ref.points.pointColor.valuesCol,
          signal,
        );
        signal?.throwIfAborted();
        // determine value range
        let vmin, vmax;
        if (ref.points.pointColorRange !== undefined) {
          [vmin, vmax] = ref.points.pointColorRange;
        } else {
          vmin = tableValues[0]!;
          vmax = tableValues[0]!;
          for (let i = 1; i < tableValues.length; i++) {
            const value = tableValues[i]!;
            if (value < vmin) {
              vmin = value;
            }
            if (value > vmax) {
              vmax = value;
            }
          }
        }
        // map values to colors
        for (let i = 0; i < tableValues.length; i++) {
          let value = tableValues[i]!;
          // clamp value to [vmin, vmax]
          if (value < vmin) {
            value = vmin!;
          } else if (value > vmax) {
            value = vmax!;
          }
          // rescale and map value to color
          value = (value - vmin) / (vmax - vmin);
          const colorIndex = Math.floor(value * palette.length);
          data[i] = ColorUtils.packColor(palette[colorIndex]!);
        }
      } else {
        // no color palette found, fallback to default color
        data.fill(ColorUtils.packColor(DEFAULT_POINT_COLOR));
      }
    } else if (isTableGroupsColumn(ref.points.pointColor)) {
      // table column contains group names
      let colorMap = undefined;
      if (ref.points.pointColorMap !== undefined) {
        colorMap =
          typeof ref.points.pointColorMap === "string"
            ? colorMaps.get(ref.points.pointColorMap)
            : ref.points.pointColorMap;
      }
      if (colorMap !== undefined) {
        // color map found, load group names
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
        // map group names to colors
        const palette =
          colorMap.palette !== undefined
            ? COLOR_PALETTES[colorMap.palette]
            : undefined;
        const groupValues = new Map(Object.entries(colorMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const value =
            groupValues.get(group) ?? // first, try to get group-specific color
            palette?.[HashUtils.djb2(group) % palette.length] ?? // then, fallback to color map palette
            colorMap.defaultValue ?? // then, fallback to color map default
            DEFAULT_POINT_COLOR; // finally, fallback to default color
          data[i] = ColorUtils.packColor(value);
        }
      } else {
        // no color map found, fallback to default color
        data.fill(ColorUtils.packColor(DEFAULT_POINT_COLOR));
      }
    } else if (ref.points.pointColor === "randomFromPalette") {
      // random colors from color palette
      const palette =
        ref.points.pointColorPalette !== undefined
          ? COLOR_PALETTES[ref.points.pointColorPalette]
          : undefined;
      if (palette !== undefined) {
        // color palette found, map random colors from palette
        for (let i = 0; i < data.length; i++) {
          const colorIndex = Math.floor(Math.random() * palette.length);
          data[i] = ColorUtils.packColor(palette[colorIndex]!);
        }
      } else {
        // no color palette found, fallback to default color
        data.fill(ColorUtils.packColor(DEFAULT_POINT_COLOR));
      }
    } else {
      // uniform color for all points
      data.fill(ColorUtils.packColor(ref.points.pointColor));
    }
    // combine color with visibility and opacity
    const visibilityData = await this._loadPointVisibilityData(
      ref,
      visibilityMaps,
      loadTableByID,
      signal,
    );
    signal?.throwIfAborted();
    const opacityData = await this._loadPointOpacityData(
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
    return data;
  }

  private async _loadPointVisibilityData(
    ref: PointsRef,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const data = new Uint8Array(ref.data.getLength());
    if (isTableValuesColumn(ref.points.pointVisibility)) {
      // table column contains visibility values
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
      // table column contains group names
      let visibilityMap = undefined;
      if (ref.points.pointVisibilityMap !== undefined) {
        visibilityMap =
          typeof ref.points.pointVisibilityMap === "string"
            ? visibilityMaps.get(ref.points.pointVisibilityMap)
            : ref.points.pointVisibilityMap;
      }
      if (visibilityMap !== undefined) {
        // visibility map found, load group names
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
        // map group names to visibilities
        const groupValues = new Map(Object.entries(visibilityMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const value =
            groupValues.get(group) ?? // first, try to get group-specific visibility
            visibilityMap.defaultValue ?? // then, fallback to visibility map default
            DEFAULT_POINT_VISIBILITY; // finally, fallback to default visibility
          data[i] = value ? 1 : 0;
        }
      } else {
        // no visibility map found, fallback to default visibility
        data.fill(DEFAULT_POINT_VISIBILITY ? 1 : 0);
      }
    } else {
      // uniform visibility for all points
      data.fill(ref.points.pointVisibility ? 1 : 0);
    }
    return data;
  }

  private async _loadPointOpacityData(
    ref: PointsRef,
    opacityMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<Uint8Array> {
    signal?.throwIfAborted();
    const opacityFactor = ref.layer.opacity * ref.points.opacity;
    const data = new Uint8Array(ref.data.getLength());
    if (isTableValuesColumn(ref.points.pointOpacity)) {
      // table column contains opacity values
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
        data[i] = Math.round(opacityFactor * tableValues[i]! * 255);
      }
    } else if (isTableGroupsColumn(ref.points.pointOpacity)) {
      // table column contains group names
      let opacityMap = undefined;
      if (ref.points.pointOpacityMap !== undefined) {
        opacityMap =
          typeof ref.points.pointOpacityMap === "string"
            ? opacityMaps.get(ref.points.pointOpacityMap)
            : ref.points.pointOpacityMap;
      }
      if (opacityMap !== undefined) {
        // opacity map found, load group names
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
        // map group names to opacities
        const groupValues = new Map(Object.entries(opacityMap.values));
        for (let i = 0; i < tableGroups.length; i++) {
          const group = JSON.stringify(tableGroups[i]!);
          const value =
            groupValues.get(group) ?? // first, try to get group-specific opacity
            opacityMap.defaultValue ?? // then, fallback to opacity map default
            DEFAULT_POINT_OPACITY; // finally, fallback to default opacity
          data[i] = Math.round(opacityFactor * value * 255);
        }
      } else {
        // no opacity map found, fallback to default opacity
        data.fill(Math.round(opacityFactor * DEFAULT_POINT_OPACITY * 255));
      }
    } else {
      // uniform opacity for all points
      data.fill(Math.round(opacityFactor * ref.points.pointOpacity * 255));
    }
    return data;
  }
}

type PointsRef = {
  layer: CompleteLayer;
  points: CompletePoints;
  rawLayerConfig: PointsLayerConfig;
  layerConfig: CompletePointsLayerConfig;
  data: PointsData;
};

type PointsBufferSlice = {
  ref: PointsRef;
  offset: number;
  nPoints: number;
  current: {
    layer: Pick<
      CompleteLayer,
      "visibility" | "opacity" | "pointSizeFactor" | "transform"
    >;
    points: Pick<
      CompletePoints,
      | "visibility"
      | "opacity"
      | "pointMarker"
      | "pointMarkerMap"
      | "pointSize"
      | "pointSizeMap"
      | "pointSizeUnit"
      | "pointSizeFactor"
      | "pointColor"
      | "pointColorRange"
      | "pointColorPalette"
      | "pointColorMap"
      | "pointVisibility"
      | "pointVisibilityMap"
      | "pointOpacity"
      | "pointOpacityMap"
    >;
    layerConfig: Pick<CompletePointsLayerConfig, "x" | "y" | "transform">;
  };
};
