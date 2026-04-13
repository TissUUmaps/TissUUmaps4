import { deepEqual } from "fast-equals";

import markersUrl from "../assets/markers/markers.png?url";
import pointsFragmentShader from "../assets/shaders/points.frag?raw";
import pointsVertexShader from "../assets/shaders/points.vert?raw";
import {
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "../model/configs";
import {
  defaultPointColor,
  defaultPointMarker,
  defaultPointOpacity,
  defaultPointSize,
  defaultPointSizeUnit,
  defaultPointVisibility,
} from "../model/constants";
import { type Layer } from "../model/layer";
import { type Points, type PointsLayerConfig } from "../model/points";
import {
  type Color,
  type CoordinateSpace,
  type DefaultMap,
  type DrawOptions,
  type Marker,
} from "../model/types";
import { type PointsData } from "../storage/points";
import { type TableData } from "../storage/table";
import { type Rect } from "../types";
import { TransformUtils } from "../utils/TransformUtils";
import { WebGLUtils } from "../utils/WebGLUtils";
import { ColorDataUtils } from "../utils/data/ColorDataUtils";
import { MarkerDataUtils } from "../utils/data/MarkerDataUtils";
import { OpacityDataUtils } from "../utils/data/OpacityDataUtils";
import { SizeDataUtils } from "../utils/data/SizeDataUtils";
import { VisibilityDataUtils } from "../utils/data/VisibilityDataUtils";
import { WebGLControllerBase } from "./WebGLControllerBase";

/**
 * WebGL sub-controller for rendering two-dimensional point clouds
 *
 * Manages GPU buffers, shaders, a marker atlas texture, and per-object
 * uniform block data. Points are rendered as `gl.POINTS` using per-vertex
 * attributes (x, y, size, color, marker, object index).
 */
export class WebGLPointsController extends WebGLControllerBase {
  private static readonly _maxNumObjects = 2048; // see vertex shader
  private static readonly _attribLocations = {
    X: 0,
    Y: 1,
    SIZE: 2,
    COLOR: 3,
    MARKER: 4,
    OBJECT: 5,
  };
  private static readonly _bindingPoints = {
    OBJECTS_UBO: 0,
  };

  private readonly _program: WebGLProgram;
  private readonly _uniformLocations: {
    worldPointSizeFactor: WebGLUniformLocation;
    worldToViewportMatrix: WebGLUniformLocation;
    viewportSize: WebGLUniformLocation;
    canvasSize: WebGLUniformLocation;
    devicePixelRatio: WebGLUniformLocation;
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
    marker: WebGLBuffer;
    object: WebGLBuffer;
    objectsUBO: WebGLBuffer;
  };
  private readonly _vao: WebGLVertexArrayObject;
  private _markerAtlasTexture: WebGLTexture | undefined;
  private _currentBufferSize: number = 0;
  private _bufferSliceStates: PointsBufferSliceState[] = [];

  /**
   * Creates the shader program, uniform locations, GPU buffers, and vertex
   * array object for point rendering
   *
   * @param gl - The WebGL 2 rendering context
   */
  constructor(gl: WebGL2RenderingContext) {
    super(gl);
    // load program
    this._program = WebGLUtils.loadProgram(
      this.gl,
      pointsVertexShader,
      pointsFragmentShader,
    );
    // get uniform locations
    this._uniformLocations = {
      worldPointSizeFactor: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_worldPointSizeFactor",
      ),
      worldToViewportMatrix: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_worldToViewportMatrix",
      ),
      viewportSize: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_viewportSize",
      ),
      canvasSize: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_canvasSize",
      ),
      devicePixelRatio: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_devicePixelRatio",
      ),
      markerAtlas: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_markerAtlas",
      ),
    };
    // get block indices
    this._uniformBlockIndices = {
      objectsUBO: this.gl.getUniformBlockIndex(this._program, "ObjectsUBO"),
    };
    // create buffers and allocate space for UBOs
    this._buffers = {
      x: WebGLUtils.createBuffer(this.gl),
      y: WebGLUtils.createBuffer(this.gl),
      size: WebGLUtils.createBuffer(this.gl),
      color: WebGLUtils.createBuffer(this.gl),
      marker: WebGLUtils.createBuffer(this.gl),
      object: WebGLUtils.createBuffer(this.gl),
      objectsUBO: WebGLUtils.createBuffer(this.gl),
    };
    WebGLUtils.resizeBuffer(
      this.gl,
      this.gl.UNIFORM_BUFFER,
      this._buffers.objectsUBO,
      WebGLPointsController._maxNumObjects * 8 * Float32Array.BYTES_PER_ELEMENT,
      this.gl.DYNAMIC_DRAW,
    );
    // create and configure VAO
    this._vao = WebGLUtils.createVertexArray(this.gl);
    this.gl.bindVertexArray(this._vao);
    WebGLUtils.configureVertexFloatAttribute(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.x,
      WebGLPointsController._attribLocations.X,
      1,
      this.gl.FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.y,
      WebGLPointsController._attribLocations.Y,
      1,
      this.gl.FLOAT,
    );
    WebGLUtils.configureVertexFloatAttribute(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.size,
      WebGLPointsController._attribLocations.SIZE,
      1,
      this.gl.FLOAT,
    );
    WebGLUtils.configureVertexIntAttribute(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.color,
      WebGLPointsController._attribLocations.COLOR,
      1,
      this.gl.UNSIGNED_INT,
    );
    WebGLUtils.configureVertexIntAttribute(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.marker,
      WebGLPointsController._attribLocations.MARKER,
      1,
      this.gl.UNSIGNED_BYTE,
    );
    WebGLUtils.configureVertexIntAttribute(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.object,
      WebGLPointsController._attribLocations.OBJECT,
      1,
      this.gl.UNSIGNED_SHORT,
    );
    this.gl.bindVertexArray(null);
  }

  /**
   * Loads the bundled marker atlas texture
   *
   * Must be called once before the first {@link draw}.
   *
   * @param options - Optional abort signal
   * @returns This controller instance, for chaining
   */
  async initialize(options?: {
    signal?: AbortSignal;
  }): Promise<WebGLPointsController> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    this._markerAtlasTexture = await WebGLUtils.loadImageTextureFromUrl(
      this.gl,
      markersUrl,
      { mipmap: true, signal },
    );
    signal?.throwIfAborted();
    return this;
  }

  /**
   * Synchronizes GPU buffers with the current model state
   *
   * Loads all points data for the given layers, resolves configuration-driven
   * properties (marker, size, color, visibility, opacity) via the provided maps
   * and table loader, and uploads the results into GPU buffers.
   *
   * @param layers - Layers to render
   * @param points - Points data objects
   * @param markerMaps - Project-global marker maps for {@link GroupByConfig} resolution
   * @param sizeMaps - Project-global size maps
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadPoints - Async loader for points data
   * @param loadTable - Async loader for table data
   * @param options - Optional abort signal
   */
  async synchronize(
    layers: Layer[],
    points: Points[],
    markerMaps: DefaultMap<Marker>[],
    sizeMaps: DefaultMap<number>[],
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadPoints: (
      pointsId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<PointsData>,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const refs = await this._loadPoints(layers, points, loadPoints, { signal });
    signal?.throwIfAborted();
    if (refs.length > WebGLPointsController._maxNumObjects) {
      console.warn(
        `Only rendering the first ${WebGLPointsController._maxNumObjects} out of ${refs.length} objects`,
      );
      refs.length = WebGLPointsController._maxNumObjects;
    }
    let buffersResized = false;
    const n = refs.reduce((accum, ref) => accum + ref.data.getSize(), 0);
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
      loadTable,
      { signal },
    );
    signal?.throwIfAborted();
  }

  /**
   * Issues the WebGL draw call for all synchronized points
   *
   * Binds the shader program, configures uniforms (transform, viewport,
   * canvas size, device pixel ratio), binds the marker atlas texture, and
   * draws all points in a single `gl.POINTS` call with alpha blending.
   *
   * @param viewport - Current world-space viewport
   * @param drawOptions - Current draw options (e.g. point size factor)
   */
  draw(viewport: Rect, drawOptions: DrawOptions): void {
    if (
      this._currentBufferSize === 0 ||
      this._markerAtlasTexture === undefined
    ) {
      return;
    }
    this.gl.useProgram(this._program);
    this.gl.bindVertexArray(this._vao);
    this.gl.bindBufferBase(
      this.gl.UNIFORM_BUFFER,
      WebGLPointsController._bindingPoints.OBJECTS_UBO,
      this._buffers.objectsUBO,
    );
    this.gl.uniformBlockBinding(
      this._program,
      this._uniformBlockIndices.objectsUBO,
      WebGLPointsController._bindingPoints.OBJECTS_UBO,
    );
    this.gl.uniform1f(
      this._uniformLocations.worldPointSizeFactor,
      drawOptions.pointSizeFactor,
    );
    this.gl.uniformMatrix3x2fv(
      this._uniformLocations.worldToViewportMatrix,
      false,
      TransformUtils.asGLMat3x2(
        WebGLPointsController.createWorldToViewportMatrix(viewport),
      ),
    );
    this.gl.uniform2f(
      this._uniformLocations.viewportSize,
      viewport.width,
      viewport.height,
    );
    this.gl.uniform2f(
      this._uniformLocations.canvasSize,
      this.gl.canvas.width,
      this.gl.canvas.height,
    );
    this.gl.uniform1f(
      this._uniformLocations.devicePixelRatio,
      window.devicePixelRatio,
    );
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, this._markerAtlasTexture);
    this.gl.uniform1i(this._uniformLocations.markerAtlas, 0);
    WebGLUtils.enableAlphaBlending(this.gl);
    this.gl.drawArrays(this.gl.POINTS, 0, this._currentBufferSize);
    WebGLUtils.disableAlphaBlending(this.gl);
    this.gl.bindVertexArray(null);
    this.gl.useProgram(null);
  }

  /**
   * Computes the axis-aligned bounding box of all rendered points in world coordinates
   *
   * @returns Bounding box in world coordinates, or `null` if no points are rendered
   */
  getWorldBounds(): Rect | null {
    if (this._bufferSliceStates.length === 0) {
      return null;
    }
    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity;
    for (const bufferSliceState of this._bufferSliceStates) {
      const transform = WebGLPointsController.createDataToWorldMatrix(
        bufferSliceState.ref.layer,
        bufferSliceState.ref.layerConfig,
      );
      const { x, y, width, height } = TransformUtils.transformBoundingBox(
        bufferSliceState.dataBounds,
        transform,
      );
      if (x < xMin) {
        xMin = x;
      }
      if (y < yMin) {
        yMin = y;
      }
      if (x + width > xMax) {
        xMax = x + width;
      }
      if (y + height > yMax) {
        yMax = y + height;
      }
    }
    if (xMax > xMin && yMax > yMin) {
      return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
    }
    return null;
  }

  /** Releases the shader program, VAO, marker atlas texture, and all GPU buffers */
  destroy(): void {
    this.gl.deleteProgram(this._program);
    this.gl.deleteVertexArray(this._vao);
    if (this._markerAtlasTexture !== undefined) {
      this.gl.deleteTexture(this._markerAtlasTexture);
    }
    for (const buffer of Object.values(this._buffers)) {
      this.gl.deleteBuffer(buffer);
    }
  }

  /**
   * Resizes all per-vertex GPU buffers to accommodate `n` points
   *
   * Existing buffer contents are discarded.
   *
   * @param n - Total number of points across all objects
   */
  private _resizePointBuffers(n: number): void {
    WebGLUtils.resizeBuffer(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.x,
      n * Float32Array.BYTES_PER_ELEMENT,
      this.gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.y,
      n * Float32Array.BYTES_PER_ELEMENT,
      this.gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.size,
      n * Float32Array.BYTES_PER_ELEMENT,
      this.gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.color,
      n * Uint32Array.BYTES_PER_ELEMENT,
      this.gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.marker,
      n * Uint8Array.BYTES_PER_ELEMENT,
      this.gl.STATIC_DRAW,
    );
    WebGLUtils.resizeBuffer(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.object,
      n * Uint16Array.BYTES_PER_ELEMENT,
      this.gl.STATIC_DRAW,
    );
    this._currentBufferSize = n;
  }

  /**
   * Loads points data for every layer configuration matching the given layers
   *
   * Objects that fail to load are logged and skipped.
   *
   * @returns A flat list of resolved point references in layer order
   */
  private async _loadPoints(
    layers: Layer[],
    points: Points[],
    loadPoints: (
      pointsId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<PointsData>,
    options?: { signal?: AbortSignal },
  ): Promise<PointsRef[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const refs: PointsRef[] = [];
    for (const layer of layers) {
      for (const currentPoints of points) {
        for (let i = 0; i < currentPoints.layerConfigs.length; i++) {
          const layerConfig = currentPoints.layerConfigs[i]!;
          if (layerConfig.layer !== layer.id) {
            continue;
          }
          let data;
          try {
            data = await loadPoints(currentPoints.id, { signal });
          } catch (error) {
            if (!signal?.aborted) {
              console.error(
                `Failed to load points with ID '${currentPoints.id}'`,
                error,
              );
            }
          }
          signal?.throwIfAborted();
          if (data !== undefined && data.getSize() > 0) {
            refs.push({
              layer,
              points: currentPoints,
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

  /**
   * Loads per-point attribute data into GPU buffers, performing incremental
   * updates where possible by comparing each buffer slice's current state
   * against the new model values
   *
   * Also populates the per-object UBO with data → world transform matrices.
   *
   * @returns An updated list of buffer slice states for the next synchronization cycle
   */
  private async _loadPointBuffers(
    refs: PointsRef[],
    markerMaps: DefaultMap<Marker>[],
    sizeMaps: DefaultMap<number>[],
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    buffersResized: boolean,
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<PointsBufferSliceState[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let offset = 0;
    const objectsUBOData = new Float32Array(
      WebGLPointsController._maxNumObjects * 8,
    );
    const newBufferSliceStates: PointsBufferSliceState[] = [];
    for (let i = 0; i < refs.length; i++) {
      const ref = refs[i]!;
      const numPoints = ref.data.getSize();
      const bufferSliceState = this._bufferSliceStates[i];
      const bufferSliceChanged =
        buffersResized ||
        bufferSliceState === undefined ||
        bufferSliceState.numPoints !== numPoints ||
        bufferSliceState.offset !== offset ||
        bufferSliceState.ref.layer.id !== ref.layer.id ||
        bufferSliceState.ref.points.id !== ref.points.id ||
        bufferSliceState.ref.layerConfigIndex !== ref.layerConfigIndex ||
        bufferSliceState.ref.data !== ref.data;
      let dataBounds = bufferSliceState?.dataBounds;
      // x/y
      if (
        bufferSliceChanged ||
        dataBounds === undefined ||
        bufferSliceState.current.layerConfig.x !== ref.layerConfig.x ||
        bufferSliceState.current.layerConfig.y !== ref.layerConfig.y
      ) {
        const xData = await ref.data.loadCoordinates(ref.layerConfig.x, {
          signal,
        });
        signal?.throwIfAborted();
        const yData = await ref.data.loadCoordinates(ref.layerConfig.y, {
          signal,
        });
        signal?.throwIfAborted();
        dataBounds = WebGLPointsController._getDataBounds(xData, yData);
        WebGLUtils.loadBuffer(
          this.gl,
          this.gl.ARRAY_BUFFER,
          this._buffers.x,
          xData,
          { offset },
        );
        WebGLUtils.loadBuffer(
          this.gl,
          this.gl.ARRAY_BUFFER,
          this._buffers.y,
          yData,
          { offset },
        );
      }
      // marker
      if (
        bufferSliceChanged ||
        !deepEqual(
          bufferSliceState.current.points.pointMarker,
          ref.points.pointMarker,
        )
      ) {
        const markerData = await MarkerDataUtils.loadMarkerData(
          ref.data.getIds(),
          ref.points.pointMarker,
          markerMaps,
          defaultPointMarker,
          loadTable,
          { signal },
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this.gl,
          this.gl.ARRAY_BUFFER,
          this._buffers.marker,
          markerData,
          { offset },
        );
      }
      // size
      if (
        bufferSliceChanged ||
        bufferSliceState.current.layer.pointSizeFactor !==
          ref.layer.pointSizeFactor ||
        bufferSliceState.current.points.pointSizeFactor !==
          ref.points.pointSizeFactor ||
        bufferSliceState.current.layer.transform.scale !==
          ref.layer.transform.scale ||
        bufferSliceState.current.layerConfig.transform.scale !==
          ref.layerConfig.transform.scale ||
        !deepEqual(
          bufferSliceState.current.points.pointSize,
          ref.points.pointSize,
        )
      ) {
        let activeUnit: CoordinateSpace;
        const activeSource = getActiveConfigSource(ref.points.pointSize);
        if (
          activeSource === "constant" &&
          isConstantConfig(ref.points.pointSize)
        ) {
          activeUnit =
            ref.points.pointSize.constant.unit ?? defaultPointSizeUnit;
        } else if (
          activeSource === "from" &&
          isFromConfig(ref.points.pointSize)
        ) {
          activeUnit = ref.points.pointSize.from.unit ?? defaultPointSizeUnit;
        } else if (
          activeSource === "groupBy" &&
          isGroupByConfig(ref.points.pointSize)
        ) {
          activeUnit =
            ref.points.pointSize.groupBy.unit ?? defaultPointSizeUnit;
        } else {
          activeUnit = defaultPointSizeUnit;
        }
        let sizeFactor = ref.points.pointSizeFactor * ref.layer.pointSizeFactor;
        if (activeUnit === "data") {
          sizeFactor *= ref.layerConfig.transform.scale;
        }
        if (activeUnit === "data" || activeUnit === "layer") {
          sizeFactor *= ref.layer.transform.scale;
        }
        const sizeData = await SizeDataUtils.loadSizeData(
          ref.data.getIds(),
          ref.points.pointSize,
          sizeMaps,
          defaultPointSize,
          loadTable,
          { signal, sizeFactor },
        );
        signal?.throwIfAborted();
        WebGLUtils.loadBuffer(
          this.gl,
          this.gl.ARRAY_BUFFER,
          this._buffers.size,
          sizeData,
          { offset },
        );
      }
      // color, visibility, opacity
      if (
        bufferSliceChanged ||
        bufferSliceState.current.layer.visibility !== ref.layer.visibility ||
        bufferSliceState.current.layer.opacity !== ref.layer.opacity ||
        bufferSliceState.current.points.visibility !== ref.points.visibility ||
        bufferSliceState.current.points.opacity !== ref.points.opacity ||
        !deepEqual(
          bufferSliceState.current.points.pointVisibility,
          ref.points.pointVisibility,
        ) ||
        !deepEqual(
          bufferSliceState.current.points.pointOpacity,
          ref.points.pointOpacity,
        ) ||
        !deepEqual(
          bufferSliceState.current.points.pointColor,
          ref.points.pointColor,
        )
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
          const visibilityData = await VisibilityDataUtils.loadVisibilityData(
            ref.data.getIds(),
            ref.points.pointVisibility,
            visibilityMaps,
            defaultPointVisibility,
            loadTable,
            { signal },
          );
          signal?.throwIfAborted();
          const opacityData = await OpacityDataUtils.loadOpacityData(
            ref.data.getIds(),
            ref.points.pointOpacity,
            opacityMaps,
            defaultPointOpacity,
            loadTable,
            { signal, opacityFactor: ref.layer.opacity * ref.points.opacity },
          );
          signal?.throwIfAborted();
          colorData = await ColorDataUtils.loadColorData(
            ref.data.getIds(),
            ref.points.pointColor,
            colorMaps,
            defaultPointColor,
            loadTable,
            { signal, visibilityData, opacityData },
          );
          signal?.throwIfAborted();
        }
        WebGLUtils.loadBuffer(
          this.gl,
          this.gl.ARRAY_BUFFER,
          this._buffers.color,
          colorData,
          { offset },
        );
      }
      if (bufferSliceChanged) {
        WebGLUtils.loadBuffer(
          this.gl,
          this.gl.ARRAY_BUFFER,
          this._buffers.object,
          new Uint16Array(numPoints).fill(i),
          { offset },
        );
      }
      newBufferSliceStates.push({
        ref,
        offset,
        numPoints,
        dataBounds,
        current: {
          layer: {
            visibility: ref.layer.visibility,
            opacity: ref.layer.opacity,
            pointSizeFactor: ref.layer.pointSizeFactor,
            transform: structuredClone(ref.layer.transform),
          },
          points: {
            visibility: ref.points.visibility,
            opacity: ref.points.opacity,
            pointMarker: structuredClone(ref.points.pointMarker),
            pointSize: structuredClone(ref.points.pointSize),
            pointColor: structuredClone(ref.points.pointColor),
            pointVisibility: structuredClone(ref.points.pointVisibility),
            pointOpacity: structuredClone(ref.points.pointOpacity),
            pointSizeFactor: ref.points.pointSizeFactor,
          },
          layerConfig: {
            x: ref.layerConfig.x,
            y: ref.layerConfig.y,
            transform: structuredClone(ref.layerConfig.transform),
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
      offset += numPoints;
    }
    WebGLUtils.loadBuffer(
      this.gl,
      this.gl.ARRAY_BUFFER,
      this._buffers.objectsUBO,
      objectsUBOData,
    );
    return newBufferSliceStates;
  }

  private static _getDataBounds(
    xData: Float32Array,
    yData: Float32Array,
  ): Rect {
    if (xData.length === 0 || yData.length === 0) {
      throw new Error("Coordinate arrays must not be empty");
    }
    if (xData.length !== yData.length) {
      throw new Error("Coordinate arrays must have the same length");
    }
    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity;
    for (let i = 0; i < Math.min(xData.length, yData.length); i++) {
      const x = xData[i]!;
      const y = yData[i]!;
      if (x < xMin) {
        xMin = x;
      }
      if (y < yMin) {
        yMin = y;
      }
      if (x > xMax) {
        xMax = x;
      }
      if (y > yMax) {
        yMax = y;
      }
    }
    return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
  }
}

/** Binding of a points data object to a specific layer and layer configuration */
type PointsRef = {
  layer: Layer;
  points: Points;
  layerConfig: PointsLayerConfig;
  layerConfigIndex: number;
  data: PointsData;
};

/**
 * Tracks the current GPU buffer state for a single points object's
 * slice within the shared vertex buffers
 *
 * Used for incremental updates: by comparing `current` against the new
 * model values, only changed attributes are re-uploaded to the GPU.
 */
type PointsBufferSliceState = {
  /** Reference to the points object this slice represents */
  ref: PointsRef;
  /** Element offset (point count) within each shared vertex buffer */
  offset: number;
  /** Number of points in this slice */
  numPoints: number;
  /** Axis-aligned bounding box of all points in data-space coordinates */
  dataBounds: Rect;
  /** Snapshot of model values at the time of the last buffer upload */
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
      | "pointSize"
      | "pointColor"
      | "pointVisibility"
      | "pointOpacity"
      | "pointSizeFactor"
    >;
    layerConfig: Pick<PointsLayerConfig, "x" | "y" | "transform">;
  };
};
