import { deepEqual } from "fast-equals";

import {
  type Color,
  type CoordinateSpace,
  type DefaultMap,
  type Layer,
  type Marker,
  type Points,
  type PointsData,
  type PointsGeometry,
  type Rect,
  type TableData,
  defaultPointColor,
  defaultPointMarker,
  defaultPointOpacity,
  defaultPointSize,
  defaultPointSizeUnit,
  defaultPointVisibility,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import markersUrl from "../assets/markers/markers.png?url";
import pointsFragmentShader from "../assets/shaders/points.frag?raw";
import pointsVertexShader from "../assets/shaders/points.vert?raw";
import type { WebGLContext } from "./WebGLContext";
import type { WebGLPointsRenderOptions } from "./WebGLOptions";
import {
  type ObjectRef,
  type RenderedObjectBase,
  WebGLRendererBase,
} from "./WebGLRendererBase";
import { WebGLUtils } from "./WebGLUtils";
import { ColorResolver } from "./resolvers/ColorResolver";
import { MarkerResolver } from "./resolvers/MarkerResolver";
import { OpacityResolver } from "./resolvers/OpacityResolver";
import { SizeResolver } from "./resolvers/SizeResolver";
import { VisibilityResolver } from "./resolvers/VisibilityResolver";

/**
 * WebGL renderer for two-dimensional point clouds
 *
 * Manages GPU buffers, shaders, a marker atlas texture, and per-object
 * uniform block data. Points are rendered as `gl.POINTS` using per-vertex
 * attributes (x, y, size, color, marker, object index).
 */
export class WebGLPointsRenderer extends WebGLRendererBase<
  Points,
  PointsData,
  RenderedPoints
> {
  private static readonly _maxNumObjects = 512; // see vertex shader
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
    globalPointSizeFactor: WebGLUniformLocation;
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
  private _globalPointSizeFactor: number;
  private _markerAtlasTexture: WebGLTexture | undefined;
  private _currentBufferSize: number = 0;

  /**
   * Creates the shader program, uniform locations, GPU buffers, and vertex
   * array object for point rendering
   *
   * @param context - The WebGL context to use for rendering
   * @param options - Options for configuring the point rendering
   */
  constructor(
    context: WebGLContext,
    onInitialized: () => void,
    onError: (error: Error) => void,
    options?: {
      viewport?: Rect;
      renderOptions?: WebGLPointsRenderOptions;
      signal?: AbortSignal;
    },
  ) {
    super(context, options);
    const { renderOptions, signal } = options ?? {};
    const { globalPointSizeFactor } = renderOptions ?? {};
    this._globalPointSizeFactor = globalPointSizeFactor ?? 1.0;
    // load program
    this._program = context.createProgram(
      pointsVertexShader,
      pointsFragmentShader,
    );
    // get uniform locations
    this._uniformLocations = {
      globalPointSizeFactor: context.getUniformLocation(
        this._program,
        "u_globalPointSizeFactor",
      ),
      worldToViewportMatrix: context.getUniformLocation(
        this._program,
        "u_worldToViewportMatrix",
      ),
      viewportSize: context.getUniformLocation(this._program, "u_viewportSize"),
      canvasSize: context.getUniformLocation(this._program, "u_canvasSize"),
      devicePixelRatio: context.getUniformLocation(
        this._program,
        "u_devicePixelRatio",
      ),
      markerAtlas: context.getUniformLocation(this._program, "u_markerAtlas"),
    };
    // get block indices
    this._uniformBlockIndices = {
      objectsUBO: context.getUniformBlockIndex(this._program, "ObjectsUBO"),
    };
    // create buffers and allocate space for UBOs
    this._buffers = {
      x: context.createBuffer(),
      y: context.createBuffer(),
      size: context.createBuffer(),
      color: context.createBuffer(),
      marker: context.createBuffer(),
      object: context.createBuffer(),
      objectsUBO: context.createBuffer(),
    };
    context.resizeBuffer(
      WebGL2RenderingContext.UNIFORM_BUFFER,
      this._buffers.objectsUBO,
      WebGLPointsRenderer._maxNumObjects * 8 * Float32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.DYNAMIC_DRAW,
    );
    // create and configure VAO
    this._vao = context.createVertexArray();
    context.gl.bindVertexArray(this._vao);
    context.configureVertexFloatAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.x,
      WebGLPointsRenderer._attribLocations.X,
      1,
      WebGL2RenderingContext.FLOAT,
    );
    context.configureVertexFloatAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.y,
      WebGLPointsRenderer._attribLocations.Y,
      1,
      WebGL2RenderingContext.FLOAT,
    );
    context.configureVertexFloatAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.size,
      WebGLPointsRenderer._attribLocations.SIZE,
      1,
      WebGL2RenderingContext.FLOAT,
    );
    context.configureVertexIntAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.color,
      WebGLPointsRenderer._attribLocations.COLOR,
      1,
      WebGL2RenderingContext.UNSIGNED_INT,
    );
    context.configureVertexIntAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.marker,
      WebGLPointsRenderer._attribLocations.MARKER,
      1,
      WebGL2RenderingContext.UNSIGNED_BYTE,
    );
    context.configureVertexIntAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.object,
      WebGLPointsRenderer._attribLocations.OBJECT,
      1,
      WebGL2RenderingContext.UNSIGNED_SHORT,
    );
    context.gl.bindVertexArray(null);
    const initialize = async () => {
      signal?.throwIfAborted();
      this._markerAtlasTexture = await context.loadImageTextureFromUrl(
        markersUrl,
        { mipmap: true, signal },
      );
      signal?.throwIfAborted();
    };
    initialize().then(onInitialized, onError);
  }

  /**
   * Sets the options for the renderer and returns whether a sync is needed
   *
   * @param options - The options to set for the renderer
   * @returns True if a sync is needed, false otherwise
   */
  setRenderOptions(options: WebGLPointsRenderOptions): {
    resync: boolean;
    redraw: boolean;
  } {
    const { globalPointSizeFactor } = options;
    if (globalPointSizeFactor !== this._globalPointSizeFactor) {
      this._globalPointSizeFactor = globalPointSizeFactor;
      return { resync: false, redraw: true };
    }
    return { resync: false, redraw: false };
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
   * @param loadPoints - Async getter for points data
   * @param loadTable - Async getter for table data
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
  ): Promise<Rect | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newRefs = await this.loadObjects(
      layers,
      points,
      loadPoints,
      loadTable,
      { signal },
    );
    signal?.throwIfAborted();
    if (newRefs.length > WebGLPointsRenderer._maxNumObjects) {
      console.warn(
        `Only rendering the first ${WebGLPointsRenderer._maxNumObjects} out of ${newRefs.length} objects`,
      );
      newRefs.length = WebGLPointsRenderer._maxNumObjects;
    }
    let buffersResized = false;
    const numPoints = newRefs.reduce(
      (n, newRef) => n + newRef.filteredItemIds.length,
      0,
    );
    if (this._currentBufferSize !== numPoints) {
      this._resizeBuffers(numPoints);
      buffersResized = true;
    }
    this.renderedObjects = await this._loadBuffers(
      newRefs,
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
    return this.getRenderedBounds();
  }

  /**
   * Issues the WebGL draw call for all synchronized points
   *
   * Binds the shader program, configures uniforms (transform, viewport,
   * canvas size, device pixel ratio), binds the marker atlas texture, and
   * draws all points in a single `gl.POINTS` call with alpha blending.
   *
   * @throws Error if the renderer has not been initialized
   */
  draw(): void {
    if (this.viewport === undefined || this._markerAtlasTexture === undefined) {
      throw new Error("Not initialized");
    }
    if (this._currentBufferSize === 0) {
      return;
    }
    this.context.gl.useProgram(this._program);
    this.context.gl.bindVertexArray(this._vao);
    this.context.gl.bindBufferBase(
      WebGL2RenderingContext.UNIFORM_BUFFER,
      WebGLPointsRenderer._bindingPoints.OBJECTS_UBO,
      this._buffers.objectsUBO,
    );
    this.context.gl.uniformBlockBinding(
      this._program,
      this._uniformBlockIndices.objectsUBO,
      WebGLPointsRenderer._bindingPoints.OBJECTS_UBO,
    );
    this.context.gl.uniform1f(
      this._uniformLocations.globalPointSizeFactor,
      this._globalPointSizeFactor,
    );
    this.context.gl.uniformMatrix3x2fv(
      this._uniformLocations.worldToViewportMatrix,
      false,
      WebGLUtils.convertMatrixToGLMat3x2(
        WebGLUtils.createWorldToViewportMatrix(this.viewport),
      ),
    );
    this.context.gl.uniform2f(
      this._uniformLocations.viewportSize,
      this.viewport.width,
      this.viewport.height,
    );
    this.context.gl.uniform2f(
      this._uniformLocations.canvasSize,
      this.context.gl.canvas.width,
      this.context.gl.canvas.height,
    );
    this.context.gl.uniform1f(
      this._uniformLocations.devicePixelRatio,
      window.devicePixelRatio,
    );
    this.context.gl.activeTexture(WebGL2RenderingContext.TEXTURE0);
    this.context.gl.bindTexture(
      WebGL2RenderingContext.TEXTURE_2D,
      this._markerAtlasTexture,
    );
    this.context.gl.uniform1i(this._uniformLocations.markerAtlas, 0);
    this.context.enableAlphaBlending();
    this.context.gl.drawArrays(
      WebGL2RenderingContext.POINTS,
      0,
      this._currentBufferSize,
    );
    this.context.disableAlphaBlending();
    this.context.gl.bindVertexArray(null);
    this.context.gl.useProgram(null);
  }

  /**
   * Releases the shader program, VAO, marker atlas texture, and all GPU buffers
   */
  destroy(): void {
    this.context.gl.deleteProgram(this._program);
    for (const buffer of Object.values(this._buffers)) {
      this.context.gl.deleteBuffer(buffer);
    }
    this.context.gl.deleteVertexArray(this._vao);
    if (this._markerAtlasTexture !== undefined) {
      this.context.gl.deleteTexture(this._markerAtlasTexture);
      this._markerAtlasTexture = undefined;
    }
    this._currentBufferSize = 0;
    this.renderedObjects = [];
  }

  /**
   * Resizes all per-vertex GPU buffers to accommodate `n` points
   *
   * Existing buffer contents are discarded.
   *
   * @param n - Total number of points across all objects
   */
  private _resizeBuffers(n: number): void {
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.x,
      n * Float32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.y,
      n * Float32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.size,
      n * Float32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.color,
      n * Uint32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.marker,
      n * Uint8Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.object,
      n * Uint16Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this._currentBufferSize = n;
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
  private async _loadBuffers(
    newRefs: PointsRef[],
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
  ): Promise<RenderedPoints[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let bufferOffset = 0;
    const objectsUBOData = new Float32Array(
      WebGLPointsRenderer._maxNumObjects * 8,
    );
    const newRenderedPoints: RenderedPoints[] = [];
    for (let objectIndex = 0; objectIndex < newRefs.length; objectIndex++) {
      const renderedPoints = this.renderedObjects[objectIndex];
      const newRef = newRefs[objectIndex]!;
      const dataChanged =
        buffersResized ||
        renderedPoints === undefined ||
        renderedPoints.bufferOffset !== bufferOffset ||
        renderedPoints.ref.layer.id !== newRef.layer.id ||
        renderedPoints.ref.object.id !== newRef.object.id ||
        // check layer configuration instead of itemMask and filteredItemIds
        !deepEqual(renderedPoints.state.points.layer, newRef.object.layer) ||
        // check data source configuration instead of data
        !deepEqual(
          renderedPoints.state.points.dataSource,
          newRef.object.dataSource,
        );
      let objectBounds =
        !dataChanged && renderedPoints !== undefined
          ? renderedPoints.objectBounds
          : undefined;
      // x/y
      if (
        dataChanged ||
        renderedPoints === undefined ||
        objectBounds === undefined
      ) {
        let { xs, ys } = await newRef.data.loadGeometry({ signal });
        signal?.throwIfAborted();
        const pointMask = newRef.itemMask;
        if (pointMask !== undefined) {
          xs = xs.filter((_, j) => pointMask[j]);
          ys = ys.filter((_, j) => pointMask[j]);
        }
        objectBounds = WebGLPointsRenderer._getObjectBounds({ xs, ys });
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.x,
          xs,
          { offset: bufferOffset },
        );
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.y,
          ys,
          { offset: bufferOffset },
        );
      }
      // marker
      if (
        dataChanged ||
        renderedPoints === undefined ||
        !deepEqual(
          renderedPoints.state.points.pointMarker,
          newRef.object.pointMarker,
        )
      ) {
        const markerData = await MarkerResolver.resolveMarkers(
          newRef.filteredItemIds,
          newRef.object.pointMarker,
          markerMaps,
          defaultPointMarker,
          loadTable,
          { signal, table: newRef.object.dataSource.table },
        );
        signal?.throwIfAborted();
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.marker,
          markerData,
          { offset: bufferOffset },
        );
      }
      // size
      if (
        dataChanged ||
        renderedPoints === undefined ||
        renderedPoints.state.layer.pointSizeFactor !==
          newRef.layer.pointSizeFactor ||
        renderedPoints.state.layer.transform.scale !==
          newRef.layer.transform.scale ||
        renderedPoints.state.points.pointSizeFactor !==
          newRef.object.pointSizeFactor ||
        renderedPoints.state.points.transform.scale !==
          newRef.object.transform.scale ||
        !deepEqual(
          renderedPoints.state.points.pointSize,
          newRef.object.pointSize,
        )
      ) {
        let activeUnit: CoordinateSpace;
        const activeSource = getActiveConfigSource(newRef.object.pointSize);
        if (
          activeSource === "constant" &&
          isConstantConfig(newRef.object.pointSize)
        ) {
          activeUnit =
            newRef.object.pointSize.constant.unit ?? defaultPointSizeUnit;
        } else if (
          activeSource === "from" &&
          isFromConfig(newRef.object.pointSize)
        ) {
          activeUnit =
            newRef.object.pointSize.from.unit ?? defaultPointSizeUnit;
        } else if (
          activeSource === "groupBy" &&
          isGroupByConfig(newRef.object.pointSize)
        ) {
          activeUnit =
            newRef.object.pointSize.groupBy.unit ?? defaultPointSizeUnit;
        } else {
          activeUnit = defaultPointSizeUnit;
        }
        let sizeFactor =
          newRef.object.pointSizeFactor * newRef.layer.pointSizeFactor;
        if (activeUnit === "data") {
          sizeFactor *= newRef.object.transform.scale;
        }
        if (activeUnit === "data" || activeUnit === "layer") {
          sizeFactor *= newRef.layer.transform.scale;
        }
        const sizeData = await SizeResolver.resolveSizes(
          newRef.filteredItemIds,
          newRef.object.pointSize,
          sizeMaps,
          defaultPointSize,
          loadTable,
          { signal, sizeFactor, table: newRef.object.dataSource.table },
        );
        signal?.throwIfAborted();
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.size,
          sizeData,
          { offset: bufferOffset },
        );
      }
      // color, visibility, opacity
      if (
        dataChanged ||
        renderedPoints === undefined ||
        renderedPoints.state.layer.visibility !== newRef.layer.visibility ||
        renderedPoints.state.layer.opacity !== newRef.layer.opacity ||
        renderedPoints.state.points.visibility !== newRef.object.visibility ||
        renderedPoints.state.points.opacity !== newRef.object.opacity ||
        !deepEqual(
          renderedPoints.state.points.pointVisibility,
          newRef.object.pointVisibility,
        ) ||
        !deepEqual(
          renderedPoints.state.points.pointOpacity,
          newRef.object.pointOpacity,
        ) ||
        !deepEqual(
          renderedPoints.state.points.pointColor,
          newRef.object.pointColor,
        )
      ) {
        let colorData;
        if (
          newRef.layer.visibility === false ||
          newRef.layer.opacity === 0 ||
          newRef.object.visibility === false ||
          newRef.object.opacity === 0
        ) {
          colorData = new Uint32Array(newRef.filteredItemIds.length).fill(0);
        } else {
          const visibilityData = await VisibilityResolver.resolveVisibilities(
            newRef.filteredItemIds,
            newRef.object.pointVisibility,
            visibilityMaps,
            defaultPointVisibility,
            loadTable,
            { signal, table: newRef.object.dataSource.table },
          );
          signal?.throwIfAborted();
          const opacityData = await OpacityResolver.resolveOpacities(
            newRef.filteredItemIds,
            newRef.object.pointOpacity,
            opacityMaps,
            defaultPointOpacity,
            loadTable,
            {
              signal,
              table: newRef.object.dataSource.table,
              opacityFactor: newRef.layer.opacity * newRef.object.opacity,
            },
          );
          signal?.throwIfAborted();
          colorData = await ColorResolver.resolveColors(
            newRef.filteredItemIds,
            newRef.object.pointColor,
            colorMaps,
            defaultPointColor,
            loadTable,
            {
              signal,
              table: newRef.object.dataSource.table,
              visibilities: visibilityData,
              opacities: opacityData,
            },
          );
          signal?.throwIfAborted();
        }
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.color,
          colorData,
          { offset: bufferOffset },
        );
      }
      if (dataChanged) {
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.object,
          new Uint16Array(newRef.filteredItemIds.length).fill(objectIndex),
          { offset: bufferOffset },
        );
      }
      newRenderedPoints.push({
        ref: newRef,
        bufferOffset,
        state: {
          layer: {
            visibility: newRef.layer.visibility,
            opacity: newRef.layer.opacity,
            pointSizeFactor: newRef.layer.pointSizeFactor,
            transform: structuredClone(newRef.layer.transform),
          },
          points: {
            layer: structuredClone(newRef.object.layer),
            dataSource: structuredClone(newRef.object.dataSource),
            visibility: newRef.object.visibility,
            opacity: newRef.object.opacity,
            pointMarker: structuredClone(newRef.object.pointMarker),
            pointSize: structuredClone(newRef.object.pointSize),
            pointColor: structuredClone(newRef.object.pointColor),
            pointVisibility: structuredClone(newRef.object.pointVisibility),
            pointOpacity: structuredClone(newRef.object.pointOpacity),
            pointSizeFactor: newRef.object.pointSizeFactor,
            transform: structuredClone(newRef.object.transform),
          },
        },
        objectBounds,
      });
      objectsUBOData.set(
        WebGLUtils.transposeAndConvertMatrixToGLMat2x4(
          WebGLUtils.createDataToWorldMatrix(newRef.object, newRef.layer),
        ),
        objectIndex * 8,
      );
      bufferOffset += newRef.filteredItemIds.length;
    }
    this.context.loadBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.objectsUBO,
      objectsUBOData,
    );
    return newRenderedPoints;
  }

  /**
   * Computes the axis-aligned bounding box of the given points in data coordinates
   *
   * @param xs - X coordinates of points in data coordinates
   * @param ys - Y coordinates of points in data coordinates
   * @returns The axis-aligned bounding box of the points in data coordinates
   * @throws Error if the coordinate arrays are empty or have different lengths
   */
  private static _getObjectBounds(geometry: PointsGeometry): Rect {
    const { xs, ys } = geometry;
    if (xs.length === 0 || ys.length === 0) {
      throw new Error("Coordinate arrays must not be empty");
    }
    if (xs.length !== ys.length) {
      throw new Error("Coordinate arrays must have the same length");
    }
    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i]!;
      const y = ys[i]!;
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

/**
 * Represents a reference to a points object along with its associated layer, item mask, filtered item IDs, and data
 */
type PointsRef = ObjectRef<Points, PointsData>;

/**
 * Tracks the current GPU buffer state for a single object's slice
 * within the shared vertex buffers
 *
 * Used for incremental updates: by comparing `config` against the new
 * model values, only changed attributes are re-uploaded to the GPU.
 */
type RenderedPoints = RenderedObjectBase<Points, PointsData> & {
  bufferOffset: number;
  state: {
    layer: Pick<
      Layer,
      "visibility" | "opacity" | "pointSizeFactor" | "transform"
    >;
    points: Pick<
      Points,
      | "layer"
      | "dataSource"
      | "visibility"
      | "opacity"
      | "pointMarker"
      | "pointSize"
      | "pointColor"
      | "pointVisibility"
      | "pointOpacity"
      | "pointSizeFactor"
      | "transform"
    >;
  };
};
