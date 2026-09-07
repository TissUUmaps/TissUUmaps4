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
  type Table,
  type TableData,
  type WebGLPointsRenderOptions,
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
 *
 * All objects share one set of buffers, each object owning the slice that starts
 * at its buffer offset. Synchronizing compares the current model state against
 * the state each slice was last loaded from, and re-uploads only what changed.
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
   * The marker atlas texture is loaded asynchronously, so the renderer must not
   * be drawn before `onInitialized` has been called; `onError` is called instead
   * if loading it failed or was aborted.
   *
   * @param context - The WebGL context to use for rendering
   * @param onInitialized - Called once the marker atlas texture has been loaded
   * @param onError - Called if the marker atlas texture could not be loaded
   * @param options - Optional abort signal, viewport, and render options
   */
  constructor(
    context: WebGLContext,
    onInitialized: () => void,
    onError: (error: Error) => void,
    options?: {
      signal?: AbortSignal;
      viewport?: Rect;
      renderOptions?: WebGLPointsRenderOptions;
    },
  ) {
    super(context, options);
    const { signal, renderOptions } = options ?? {};
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
    };
    initialize().then(onInitialized, onError);
  }

  /**
   * Sets the render options, and reports what they require to take effect
   *
   * The global point size factor is a shader uniform, so changing it never
   * requires a resynchronization, only a redraw.
   *
   * @param options - The options to set for the renderer
   * @returns Whether the renderer has to be resynchronized and/or redrawn
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
   * and table loader, and uploads the results into GPU buffers. Only the
   * properties whose configuration actually changed are resolved again.
   *
   * Objects beyond the shader's per-object limit are dropped, with a warning.
   *
   * @param layers - Layers to render
   * @param points - Points data objects
   * @param tables - Tables that the points objects resolve their properties from
   * @param markerMaps - Project-global marker maps for {@link GroupByConfig} resolution
   * @param sizeMaps - Project-global size maps
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadPoints - Async getter for points data
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   * @returns The bounding box of all rendered points in world coordinates, or
   * `null` if nothing is rendered
   */
  async synchronize(
    layers: Layer[],
    points: Points[],
    tables: Table[],
    markerMaps: DefaultMap<Marker>[],
    sizeMaps: DefaultMap<number>[],
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadPoints: (
      points: Points,
      options?: { signal?: AbortSignal },
    ) => Promise<PointsData>,
    loadTable: (
      table: Table,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<Rect | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newRefs = await this.loadObjects(
      layers,
      points,
      tables,
      loadPoints,
      loadTable,
      { signal },
    );
    if (newRefs.length > WebGLPointsRenderer._maxNumObjects) {
      console.warn(
        `Only rendering the first ${WebGLPointsRenderer._maxNumObjects} out of ${newRefs.length} objects`,
      );
      newRefs.length = WebGLPointsRenderer._maxNumObjects;
    }
    let buffersResized = false;
    const numPoints = newRefs.reduce(
      (n, newRef) => n + newRef.itemIds.length,
      0,
    );
    if (this._currentBufferSize !== numPoints) {
      this._resizeBuffers(numPoints);
      buffersResized = true;
    }
    this.renderedObjects = await this._loadBuffers(
      newRefs,
      tables,
      markerMaps,
      sizeMaps,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      buffersResized,
      loadTable,
      { signal },
    );
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
   * Runs in two passes. The first decides for every object what its buffer
   * slice needs and requests all of it - the geometry, and the resolved marker,
   * size and color buffers - while the second awaits those requests in slice
   * order and uploads them.
   *
   * Requests resolve through operations that are shared between their callers
   * and cancelled once the last of them has given up, unless it is reclaimed
   * within the same task. Issuing them one object at a time would therefore
   * throw away the requests of a synchronization that has just been superseded:
   * the gap until the new pass reaches an object grows with the objects ahead
   * of it, until it spans a task and their operations are cancelled and have to
   * start over from scratch. Issuing them all before the first `await` keeps
   * that gap within a single task, no matter how many objects there are or how
   * long each of them takes. It also lets them run concurrently, at the price
   * of holding every object's resolved buffers until the second pass has
   * uploaded them.
   *
   * @param newRefs - The objects to load, in the order of their buffer slices
   * @param tables - Tables that the objects resolve their properties from
   * @param markerMaps - Project-global marker maps
   * @param sizeMaps - Project-global size maps
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param buffersResized - Whether the buffers were reallocated, which
   * invalidates every slice and forces a full reload
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   * @returns An updated list of buffer slice states for the next synchronization cycle
   */
  private async _loadBuffers(
    newRefs: PointsRef[],
    tables: Table[],
    markerMaps: DefaultMap<Marker>[],
    sizeMaps: DefaultMap<number>[],
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    buffersResized: boolean,
    loadTable: (
      table: Table,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<RenderedPoints[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const objectPreloads: {
      newRef: PointsRef;
      renderedPoints: RenderedPoints | undefined;
      bufferOffset: number;
      dataChanged: boolean;
      geometryPromise?: Promise<PointsGeometry>;
      markersPromise?: Promise<Uint8Array>;
      sizesPromise?: Promise<Float32Array>;
      colorsPromise?: Promise<Uint32Array>;
      visibilitiesPromise?: Promise<Uint8Array>;
      opacitiesPromise?: Promise<Uint8Array>;
    }[] = [];
    let nextBufferOffset = 0;
    for (let objectIndex = 0; objectIndex < newRefs.length; objectIndex++) {
      const newRef = newRefs[objectIndex]!;
      const renderedPoints = this.renderedObjects[objectIndex];
      let loadObjectTable;
      if (newRef.object.dataSource.table !== undefined) {
        const objectTable = tables.find(
          (table) => table.id === newRef.object.dataSource.table,
        );
        if (objectTable !== undefined) {
          loadObjectTable = (options?: { signal?: AbortSignal }) =>
            loadTable(objectTable, options);
        } else {
          console.warn(
            `Table with ID ${newRef.object.dataSource.table} not found`,
          );
        }
      }
      const dataChanged = WebGLPointsRenderer._checkDataChanged(
        renderedPoints,
        newRef,
        nextBufferOffset,
        buffersResized,
      );
      const geometryPromise = dataChanged
        ? newRef.data.loadGeometry({ signal })
        : undefined;
      geometryPromise?.catch(() => {}); // prevent unhandled rejections in console
      const markersPromise =
        dataChanged ||
        WebGLPointsRenderer._checkMarkersChanged(renderedPoints, newRef)
          ? WebGLPointsRenderer._resolveMarkers(newRef, markerMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      markersPromise?.catch(() => {}); // prevent unhandled rejections in console
      const sizesPromise =
        dataChanged ||
        WebGLPointsRenderer._checkSizesChanged(renderedPoints, newRef)
          ? WebGLPointsRenderer._resolveSizes(newRef, sizeMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      sizesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const colorsPromise =
        dataChanged ||
        WebGLPointsRenderer._checkColorsChanged(renderedPoints, newRef)
          ? WebGLPointsRenderer._resolveColors(newRef, colorMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      colorsPromise?.catch(() => {}); // prevent unhandled rejections in console
      const visibilitiesPromise =
        dataChanged ||
        WebGLPointsRenderer._checkColorsChanged(renderedPoints, newRef)
          ? WebGLPointsRenderer._resolveVisibilities(newRef, visibilityMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      visibilitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const opacitiesPromise =
        dataChanged ||
        WebGLPointsRenderer._checkColorsChanged(renderedPoints, newRef)
          ? WebGLPointsRenderer._resolveOpacities(newRef, opacityMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      opacitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      objectPreloads.push({
        newRef,
        renderedPoints,
        bufferOffset: nextBufferOffset,
        dataChanged,
        geometryPromise,
        markersPromise,
        sizesPromise,
        colorsPromise,
        visibilitiesPromise,
        opacitiesPromise,
      });
      nextBufferOffset += newRef.itemIds.length;
    }
    const newRenderedPoints: RenderedPoints[] = [];
    const objectsUBOBuffer = new Float32Array(
      WebGLPointsRenderer._maxNumObjects * 8,
    );
    for (
      let objectIndex = 0;
      objectIndex < objectPreloads.length;
      objectIndex++
    ) {
      const {
        newRef,
        renderedPoints,
        bufferOffset,
        dataChanged,
        geometryPromise,
        markersPromise,
        sizesPromise,
        colorsPromise,
        visibilitiesPromise,
        opacitiesPromise,
      } = objectPreloads[objectIndex]!;
      const [geometry, markers, sizes, colors, visibilities, opacities] =
        await Promise.all([
          geometryPromise,
          markersPromise,
          sizesPromise,
          colorsPromise,
          visibilitiesPromise,
          opacitiesPromise,
        ]);
      signal?.throwIfAborted();
      let objectBounds: Rect;
      if (geometry !== undefined) {
        let { xs, ys } = geometry;
        const pointsMask = newRef.itemsMask;
        if (pointsMask !== undefined) {
          xs = xs.filter((_, j) => pointsMask[j]! > 0);
          ys = ys.filter((_, j) => pointsMask[j]! > 0);
        }
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
        objectBounds = WebGLPointsRenderer._getObjectBounds({ xs, ys });
      } else if (renderedPoints !== undefined) {
        objectBounds = renderedPoints.objectBounds;
      } else {
        throw new Error("Geometry must be loaded for new points object");
      }
      if (markers !== undefined) {
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.marker,
          markers,
          { offset: bufferOffset },
        );
      }
      if (sizes !== undefined) {
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.size,
          sizes,
          { offset: bufferOffset },
        );
      }
      if (
        colors !== undefined &&
        visibilities !== undefined &&
        opacities !== undefined
      ) {
        await WebGLPointsRenderer.packAlpha(colors, visibilities, opacities, {
          signal,
        });
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.color,
          colors,
          { offset: bufferOffset },
        );
      }
      if (dataChanged) {
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          this._buffers.object,
          new Uint16Array(newRef.itemIds.length).fill(objectIndex),
          { offset: bufferOffset },
        );
      }
      objectsUBOBuffer.set(
        WebGLUtils.transposeAndConvertMatrixToGLMat2x4(
          WebGLUtils.createDataToWorldMatrix(
            newRef.object.transform,
            newRef.layer.transform,
          ),
        ),
        objectIndex * 8,
      );
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
    }
    this.context.loadBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      this._buffers.objectsUBO,
      objectsUBOBuffer,
    );
    return newRenderedPoints;
  }

  /**
   * Computes the axis-aligned bounding box of the given points in data coordinates
   *
   * @param geometry - X and Y coordinates of the points, in data coordinates
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

  /**
   * Returns whether the point data of an object has to be reloaded entirely
   *
   * True whenever the buffers were reallocated, the object's slice moved to a
   * different offset, the object itself was replaced, the items it contributes
   * to the layer changed, or its data source changed. It is also true for an
   * object that has not been rendered yet, which is why the other predicates do
   * not have to check for that.
   */
  private static _checkDataChanged(
    renderedPoints: RenderedPoints | undefined,
    newRef: PointsRef,
    bufferOffset: number,
    buffersResized: boolean,
  ): boolean {
    return (
      buffersResized ||
      renderedPoints === undefined ||
      renderedPoints.bufferOffset !== bufferOffset ||
      renderedPoints.ref.layer.id !== newRef.layer.id ||
      renderedPoints.ref.object.id !== newRef.object.id ||
      renderedPoints.ref.itemIds !== newRef.itemIds ||
      renderedPoints.ref.itemsMask !== newRef.itemsMask ||
      // check data source configuration instead of data
      !deepEqual(
        renderedPoints.state.points.dataSource,
        newRef.object.dataSource,
      )
    );
  }

  /**
   * Returns whether the markers of an object have to be resolved again
   */
  private static _checkMarkersChanged(
    renderedPoints: RenderedPoints | undefined,
    newRef: PointsRef,
  ): boolean {
    return (
      renderedPoints === undefined ||
      !deepEqual(
        renderedPoints.state.points.pointMarker,
        newRef.object.pointMarker,
      )
    );
  }

  /**
   * Returns whether the sizes of an object have to be resolved again
   *
   * Besides the point size configuration itself, sizes depend on the scaling
   * factors and transforms that {@link _resolveSizes} multiplies into them.
   */
  private static _checkSizesChanged(
    renderedPoints: RenderedPoints | undefined,
    newRef: PointsRef,
  ): boolean {
    return (
      renderedPoints === undefined ||
      renderedPoints.state.layer.pointSizeFactor !==
        newRef.layer.pointSizeFactor ||
      renderedPoints.state.layer.transform.scale !==
        newRef.layer.transform.scale ||
      renderedPoints.state.points.pointSizeFactor !==
        newRef.object.pointSizeFactor ||
      renderedPoints.state.points.transform.scale !==
        newRef.object.transform.scale ||
      !deepEqual(renderedPoints.state.points.pointSize, newRef.object.pointSize)
    );
  }

  /**
   * Returns whether the colors of an object have to be resolved again
   *
   * Colors carry the resolved visibilities and opacities in their alpha channel,
   * so they also depend on the layer- and object-level visibility and opacity.
   */
  private static _checkColorsChanged(
    renderedPoints: RenderedPoints | undefined,
    newRef: PointsRef,
  ): boolean {
    return (
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
    );
  }

  /**
   * Resolves the marker of every point of an object
   *
   * @param options - Optional abort signal and table loader
   */
  private static _resolveMarkers(
    ref: PointsRef,
    markerMaps: DefaultMap<Marker>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    const { signal, loadTable } = options ?? {};
    return MarkerResolver.resolveMarkers(
      ref.itemIds,
      ref.object.pointMarker,
      markerMaps,
      defaultPointMarker,
      { signal, loadTable },
    );
  }

  /**
   * Resolves the size of every point of an object
   *
   * @param options - Optional abort signal and table loader
   */
  private static _resolveSizes(
    ref: PointsRef,
    sizeMaps: DefaultMap<number>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Float32Array> {
    const { signal, loadTable } = options ?? {};
    let activeUnit: CoordinateSpace;
    const activeSource = getActiveConfigSource(ref.object.pointSize);
    if (activeSource === "constant" && isConstantConfig(ref.object.pointSize)) {
      activeUnit = ref.object.pointSize.constant.unit ?? defaultPointSizeUnit;
    } else if (activeSource === "from" && isFromConfig(ref.object.pointSize)) {
      activeUnit = ref.object.pointSize.from.unit ?? defaultPointSizeUnit;
    } else if (
      activeSource === "groupBy" &&
      isGroupByConfig(ref.object.pointSize)
    ) {
      activeUnit = ref.object.pointSize.groupBy.unit ?? defaultPointSizeUnit;
    } else {
      activeUnit = defaultPointSizeUnit;
    }
    let sizeFactor = ref.object.pointSizeFactor * ref.layer.pointSizeFactor;
    if (activeUnit === "data") {
      sizeFactor *= ref.object.transform.scale;
    }
    if (activeUnit === "data" || activeUnit === "layer") {
      sizeFactor *= ref.layer.transform.scale;
    }
    return SizeResolver.resolveSizes(
      ref.itemIds,
      ref.object.pointSize,
      sizeMaps,
      defaultPointSize,
      { signal, sizeFactor, loadTable },
    );
  }

  /**
   * Resolves the RGB color of every point of an object
   *
   * The alpha channel is added later, by
   * {@link WebGLRendererBase.packAlpha}, from the separately resolved
   * visibilities and opacities.
   *
   * @param options - Optional abort signal and table loader
   * @returns The packed colors, one per point, without alpha
   */
  private static _resolveColors(
    ref: PointsRef,
    colorMaps: DefaultMap<Color>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint32Array> {
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.object.visibility === false ||
      ref.object.opacity === 0
    ) {
      return Promise.resolve(new Uint32Array(ref.itemIds.length));
    }
    return ColorResolver.resolveColors(
      ref.itemIds,
      ref.object.pointColor,
      colorMaps,
      defaultPointColor,
      options,
    );
  }

  /**
   * Resolves the visibility of every point of an object
   *
   * @param options - Optional abort signal and table loader
   * @returns The visibilities, one per point, `0` for invisible
   */
  private static _resolveVisibilities(
    ref: PointsRef,
    visibilityMaps: DefaultMap<boolean>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.object.visibility === false ||
      ref.object.opacity === 0
    ) {
      return Promise.resolve(new Uint8Array(ref.itemIds.length));
    }
    return VisibilityResolver.resolveVisibilities(
      ref.itemIds,
      ref.object.pointVisibility,
      visibilityMaps,
      defaultPointVisibility,
      options,
    );
  }

  /**
   * Resolves the alpha of every point of an object
   *
   * The layer- and object-level opacities are multiplied into the resolved
   * per-point opacities, as the shader only sees the alpha channel.
   *
   * @param options - Optional abort signal and table loader
   * @returns The alpha values, one per point
   */
  private static _resolveOpacities(
    ref: PointsRef,
    opacityMaps: DefaultMap<number>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.object.visibility === false ||
      ref.object.opacity === 0
    ) {
      return Promise.resolve(new Uint8Array(ref.itemIds.length));
    }
    const opacityFactor = ref.layer.opacity * ref.object.opacity;
    return OpacityResolver.resolveOpacities(
      ref.itemIds,
      ref.object.pointOpacity,
      opacityMaps,
      defaultPointOpacity,
      { ...options, opacityFactor },
    );
  }
}

/**
 * A reference to a points object, its layer, and its loaded data
 */
type PointsRef = ObjectRef<Points, PointsData>;

/**
 * Tracks the current GPU buffer state for a single object's slice
 * within the shared vertex buffers
 *
 * Used for incremental updates: the `state` snapshot is what the change
 * predicates compare the new model values against, so every property they read
 * has to be captured in it.
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
