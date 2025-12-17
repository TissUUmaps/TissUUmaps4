import markersUrl from "../assets/markers/markers.png?url";
import pointsFragmentShader from "../assets/shaders/points.frag?raw";
import pointsVertexShader from "../assets/shaders/points.vert?raw";
import {
  type Layer,
  type Points,
  type PointsLayerConfig,
  pointsDefaults,
} from "../model";
import { type PointsData, type TableData } from "../storage";
import {
  type ColorMap,
  type DrawOptions,
  Marker,
  type Rect,
  type ValueMap,
} from "../types";
import { LoadUtils, TransformUtils, WebGLUtils } from "../utils";
import { WebGLControllerBase } from "./WebGLControllerBase";

export class WebGLPointsController extends WebGLControllerBase {
  private static readonly _maxNumObjects = 256; // see vertex shader
  private static readonly _attribLocations = {
    X: 0,
    Y: 1,
    SIZE: 2,
    COLOR: 3,
    MARKER_INDEX: 4,
    OBJECT_INDEX: 5,
  };
  private static readonly _bindingPoints = {
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
  private _currentBufferSize: number = 0;
  private _bufferSliceStates: PointsBufferSliceState[] = [];

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
      gl.UNIFORM_BUFFER,
      this._buffers.objectsUBO,
      WebGLPointsController._maxNumObjects * 8 * Float32Array.BYTES_PER_ELEMENT,
      gl.DYNAMIC_DRAW,
    );
    // create and configure VAO
    this._vao = WebGLUtils.createVertexArray(this._gl);
    this._gl.bindVertexArray(this._vao);
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.x,
      WebGLPointsController._attribLocations.X,
      1,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.y,
      WebGLPointsController._attribLocations.Y,
      1,
      this._gl.FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.size,
      WebGLPointsController._attribLocations.SIZE,
      1,
      this._gl.HALF_FLOAT,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.color,
      WebGLPointsController._attribLocations.COLOR,
      1,
      this._gl.UNSIGNED_INT,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.markerIndex,
      WebGLPointsController._attribLocations.MARKER_INDEX,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    WebGLUtils.configureVertexIntAttribute(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.objectIndex,
      WebGLPointsController._attribLocations.OBJECT_INDEX,
      1,
      this._gl.UNSIGNED_BYTE,
    );
    this._gl.bindVertexArray(null);
  }

  async initialize({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<WebGLPointsController> {
    signal?.throwIfAborted();
    this._markerAtlasTexture = await WebGLUtils.loadImageTextureFromUrl(
      this._gl,
      markersUrl,
      { mipmap: true, signal },
    );
    signal?.throwIfAborted();
    return this;
  }

  async synchronize(
    layerMap: Map<string, Layer>,
    pointsMap: Map<string, Points>,
    markerMaps: Map<string, ValueMap<Marker>>,
    sizeMaps: Map<string, ValueMap<number>>,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    loadPoints: (
      points: Points,
      options: { signal?: AbortSignal },
    ) => Promise<PointsData>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<void> {
    signal?.throwIfAborted();
    const refs = await this._loadPoints(layerMap, pointsMap, loadPoints, {
      signal,
    });
    signal?.throwIfAborted();
    if (refs.length > WebGLPointsController._maxNumObjects) {
      console.warn(
        `Only rendering the first ${WebGLPointsController._maxNumObjects} out of ${refs.length} objects`,
      );
      refs.length = WebGLPointsController._maxNumObjects;
    }
    let buffersResized = false;
    const n = refs.reduce((accum, ref) => accum + ref.data.getLength(), 0);
    if (this._currentBufferSize !== n) {
      this._resizePointBuffers(n);
      buffersResized = true;
    }
    this._bufferSliceStates = await this._loadPointBuffers(
      refs,
      markerMaps,
      sizeMaps,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      buffersResized,
      loadTableByID,
      { signal },
    );
    signal?.throwIfAborted();
  }

  draw(viewport: Rect, drawOptions: DrawOptions): void {
    if (
      this._currentBufferSize === 0 ||
      this._markerAtlasTexture === undefined
    ) {
      return;
    }
    this._gl.useProgram(this._program);
    this._gl.bindVertexArray(this._vao);
    this._gl.bindBufferBase(
      this._gl.UNIFORM_BUFFER,
      WebGLPointsController._bindingPoints.OBJECTS_UBO,
      this._buffers.objectsUBO,
    );
    this._gl.uniformBlockBinding(
      this._program,
      this._uniformBlockIndices.objectsUBO,
      WebGLPointsController._bindingPoints.OBJECTS_UBO,
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
    this._gl.drawArrays(this._gl.POINTS, 0, this._currentBufferSize);
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

  private _resizePointBuffers(n: number): void {
    WebGLUtils.resizeBuffer(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.x,
      n * Float32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.y,
      n * Float32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.size,
      n * Float32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.color,
      n * Uint32Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.markerIndex,
      n * Uint8Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.objectIndex,
      n * Uint8Array.BYTES_PER_ELEMENT,
      this._gl.STATIC_DRAW,
    );
    this._currentBufferSize = n;
  }

  private async _loadPoints(
    layerMap: Map<string, Layer>,
    pointsMap: Map<string, Points>,
    loadPoints: (
      points: Points,
      options: { signal?: AbortSignal },
    ) => Promise<PointsData>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<PointsRef[]> {
    signal?.throwIfAborted();
    const refs: PointsRef[] = [];
    for (const layer of layerMap.values()) {
      for (const points of pointsMap.values()) {
        for (let i = 0; i < points.layerConfigs.length; i++) {
          const layerConfig = points.layerConfigs[i]!;
          if (layerConfig.layerId !== layer.id) {
            continue;
          }
          let data;
          try {
            data = await loadPoints(points, { signal });
          } catch (error) {
            if (!signal?.aborted) {
              console.error(
                `Failed to load points with ID '${points.id}'`,
                error,
              );
            }
          }
          signal?.throwIfAborted();
          if (data !== undefined) {
            refs.push({
              layer,
              points,
              layerConfig,
              layerConfigIndex: i,
              data,
            });
          }
        }
      }
    }
    return refs;
  }

  private async _loadPointBuffers(
    refs: PointsRef[],
    markerMaps: Map<string, ValueMap<Marker>>,
    sizeMaps: Map<string, ValueMap<number>>,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    buffersResized: boolean,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<PointsBufferSliceState[]> {
    signal?.throwIfAborted();
    let offset = 0;
    const objectsUBOData = new Float32Array(
      WebGLPointsController._maxNumObjects * 8,
    );
    const newBufferSliceStates: PointsBufferSliceState[] = [];
    for (let objectIndex = 0; objectIndex < refs.length; objectIndex++) {
      const ref = refs[objectIndex]!;
      const numPoints = ref.data.getLength();
      const bufferSliceState = this._bufferSliceStates[objectIndex];
      const bufferSliceChanged =
        buffersResized ||
        bufferSliceState === undefined ||
        bufferSliceState.numPoints !== numPoints ||
        bufferSliceState.offset !== offset ||
        bufferSliceState.ref.layer.id !== ref.layer.id ||
        bufferSliceState.ref.points.id !== ref.points.id ||
        bufferSliceState.ref.layerConfigIndex !== ref.layerConfigIndex ||
        bufferSliceState.ref.data !== ref.data;
      if (
        bufferSliceChanged ||
        bufferSliceState.current.layerConfig.x !== ref.layerConfig.x
      ) {
        const data = await ref.data.loadCoordinates(ref.layerConfig.x, {
          signal,
        });
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this._gl,
          this._gl.ARRAY_BUFFER,
          this._buffers.x,
          data,
          { offset },
        );
      }
      if (
        bufferSliceChanged ||
        bufferSliceState.current.layerConfig.y !== ref.layerConfig.y
      ) {
        const data = await ref.data.loadCoordinates(ref.layerConfig.y, {
          signal,
        });
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this._gl,
          this._gl.ARRAY_BUFFER,
          this._buffers.y,
          data,
          { offset },
        );
      }
      if (
        bufferSliceChanged ||
        bufferSliceState.current.points.pointMarker !==
          ref.points.pointMarker ||
        bufferSliceState.current.points.pointMarkerMap !==
          ref.points.pointMarkerMap
      ) {
        const markerIndexData = await LoadUtils.loadMarkerIndexData(
          numPoints,
          ref.points.pointMarker,
          ref.points.pointMarkerMap,
          pointsDefaults.pointMarker,
          markerMaps,
          loadTableByID,
          { signal },
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this._gl,
          this._gl.ARRAY_BUFFER,
          this._buffers.markerIndex,
          markerIndexData,
          { offset },
        );
      }
      if (
        bufferSliceChanged ||
        bufferSliceState.current.layer.transform.scale !==
          ref.layer.transform.scale ||
        bufferSliceState.current.layer.pointSizeFactor !==
          ref.layer.pointSizeFactor ||
        bufferSliceState.current.points.pointSize !== ref.points.pointSize ||
        bufferSliceState.current.points.pointSizeMap !==
          ref.points.pointSizeMap ||
        bufferSliceState.current.points.pointSizeUnit !==
          ref.points.pointSizeUnit ||
        bufferSliceState.current.points.pointSizeFactor !==
          ref.points.pointSizeFactor ||
        bufferSliceState.current.layerConfig.transform.scale !==
          ref.layerConfig.transform.scale
      ) {
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
        const sizeData = await LoadUtils.loadSizeData(
          numPoints,
          ref.points.pointSize,
          ref.points.pointSizeMap,
          pointsDefaults.pointSize,
          sizeMaps,
          loadTableByID,
          { signal, sizeFactor },
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this._gl,
          this._gl.ARRAY_BUFFER,
          this._buffers.size,
          sizeData,
          { offset },
        );
      }
      if (
        bufferSliceChanged ||
        bufferSliceState.current.layer.visibility !== ref.layer.visibility ||
        bufferSliceState.current.layer.opacity !== ref.layer.opacity ||
        bufferSliceState.current.points.visibility !== ref.points.visibility ||
        bufferSliceState.current.points.opacity !== ref.points.opacity ||
        bufferSliceState.current.points.pointVisibility !==
          ref.points.pointVisibility ||
        bufferSliceState.current.points.pointVisibilityMap !==
          ref.points.pointVisibilityMap ||
        bufferSliceState.current.points.pointOpacity !==
          ref.points.pointOpacity ||
        bufferSliceState.current.points.pointOpacityMap !==
          ref.points.pointOpacityMap ||
        bufferSliceState.current.points.pointColor !== ref.points.pointColor ||
        bufferSliceState.current.points.pointColorRange !==
          ref.points.pointColorRange ||
        bufferSliceState.current.points.pointColorPalette !==
          ref.points.pointColorPalette ||
        bufferSliceState.current.points.pointColorMap !==
          ref.points.pointColorMap
      ) {
        let colorData;
        if (
          ref.layer.visibility === false ||
          ref.layer.opacity === 0 ||
          ref.points.visibility === false ||
          ref.points.opacity === 0
        ) {
          colorData = new Uint32Array(numPoints).fill(0);
        } else {
          const visibilityData = await LoadUtils.loadVisibilityData(
            numPoints,
            ref.points.pointVisibility,
            ref.points.pointVisibilityMap,
            pointsDefaults.pointVisibility,
            visibilityMaps,
            loadTableByID,
            { signal },
          );
          signal?.throwIfAborted();
          const opacityData = await LoadUtils.loadOpacityData(
            numPoints,
            ref.points.pointOpacity,
            ref.points.pointOpacityMap,
            pointsDefaults.pointOpacity,
            opacityMaps,
            loadTableByID,
            { signal, opacityFactor: ref.layer.opacity * ref.points.opacity },
          );
          signal?.throwIfAborted();
          colorData = await LoadUtils.loadColorData(
            numPoints,
            ref.points.pointColor,
            ref.points.pointColorRange,
            ref.points.pointColorPalette,
            ref.points.pointColorMap,
            pointsDefaults.pointColor,
            visibilityData,
            opacityData,
            colorMaps,
            loadTableByID,
            { signal },
          );
        }
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this._gl,
          this._gl.ARRAY_BUFFER,
          this._buffers.color,
          colorData,
          { offset },
        );
      }
      if (bufferSliceChanged) {
        WebGLUtils.loadBuffer(
          this._gl,
          this._gl.ARRAY_BUFFER,
          this._buffers.objectIndex,
          new Uint8Array(numPoints).fill(objectIndex),
          { offset },
        );
      }
      newBufferSliceStates.push({
        ref: ref,
        offset: offset,
        numPoints: numPoints,
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
        objectIndex * 8,
      );
      offset += numPoints;
    }
    WebGLUtils.loadBuffer(
      this._gl,
      this._gl.ARRAY_BUFFER,
      this._buffers.objectsUBO,
      objectsUBOData,
    );
    return newBufferSliceStates;
  }
}

type PointsRef = {
  layer: Layer;
  points: Points;
  layerConfig: PointsLayerConfig;
  layerConfigIndex: number;
  data: PointsData;
};

type PointsBufferSliceState = {
  ref: PointsRef;
  offset: number;
  numPoints: number;
  current: {
    layer: Pick<
      Layer,
      "visibility" | "opacity" | "pointSizeFactor" | "transform"
    >;
    points: Pick<
      Points,
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
    layerConfig: Pick<PointsLayerConfig, "x" | "y" | "transform">;
  };
};
