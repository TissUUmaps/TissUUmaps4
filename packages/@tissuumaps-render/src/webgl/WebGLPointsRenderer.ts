import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  type Color,
  ColorUtils,
  type CoordinateSpace,
  type GroupValueMap,
  type Layer,
  type Marker,
  MathUtils,
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
import { ColorResolver } from "../resolvers/ColorResolver";
import { MarkerResolver } from "../resolvers/MarkerResolver";
import { OpacityResolver } from "../resolvers/OpacityResolver";
import { SizeResolver } from "../resolvers/SizeResolver";
import { VisibilityResolver } from "../resolvers/VisibilityResolver";
import type { WebGLContext } from "./WebGLContext";
import {
  type ObjectRef,
  type RenderedObjectBase,
  WebGLRendererBase,
} from "./WebGLRendererBase";
import { WebGLUtils } from "./WebGLUtils";

/**
 * WebGL renderer for two-dimensional point clouds
 *
 * Manages a shader program, a marker atlas texture, and per-object GPU
 * buffers. Points are rendered as `gl.POINTS` using per-vertex attributes (x,
 * y, size, color, marker), one draw call per object.
 *
 * Every object owns its vertex array and attribute buffers. Synchronizing
 * compares the current model state against the state those buffers were
 * loaded from, and re-uploads only the attributes whose inputs changed.
 * Layer- and object-level properties (transforms, point size factors,
 * visibility and opacity) are shader uniforms, so changing them never touches
 * the buffers.
 */
export class WebGLPointsRenderer extends WebGLRendererBase<
  Points,
  PointsData,
  RenderedPoints
> {
  private static readonly _attribLocations = {
    X: 0,
    Y: 1,
    SIZE: 2,
    COLOR: 3,
    MARKER: 4,
  };

  private readonly _program: WebGLProgram;
  private readonly _uniformLocations: {
    globalPointSizeFactor: WebGLUniformLocation;
    worldToViewportMatrix: WebGLUniformLocation;
    viewportSize: WebGLUniformLocation;
    canvasSize: WebGLUniformLocation;
    devicePixelRatio: WebGLUniformLocation;
    dataToWorldMatrix: WebGLUniformLocation;
    pointSizeFactor: WebGLUniformLocation;
    opacityFactor: WebGLUniformLocation;
    markerAtlas: WebGLUniformLocation;
  };
  private _globalPointSizeFactor: number;
  private _markerAtlasTexture: WebGLTexture | undefined;

  /**
   * Creates the shader program and retrieves uniform locations
   *
   * The marker atlas texture is loaded asynchronously, so the renderer must not
   * be drawn before `onInitialized` has been called; `onError` is called instead
   * if loading it failed or was aborted.
   *
   * @param context - The WebGL context to use for rendering
   * @param onInitialized - Called once the marker atlas texture has been loaded
   * @param onError - Called if the marker atlas texture could not be loaded
   * @param options - Optional abort signal and render options
   */
  constructor(
    context: WebGLContext,
    onInitialized: () => void,
    onError: (error: Error) => void,
    options?: {
      signal?: AbortSignal;
      renderOptions?: WebGLPointsRenderOptions;
    },
  ) {
    super(context);
    const { signal, renderOptions } = options ?? {};
    const { globalPointSizeFactor } = renderOptions ?? {};
    this._globalPointSizeFactor = globalPointSizeFactor ?? 1.0;
    this._program = context.createProgram(
      pointsVertexShader,
      pointsFragmentShader,
    );
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
      dataToWorldMatrix: context.getUniformLocation(
        this._program,
        "u_dataToWorldMatrix",
      ),
      pointSizeFactor: context.getUniformLocation(
        this._program,
        "u_pointSizeFactor",
      ),
      opacityFactor: context.getUniformLocation(
        this._program,
        "u_opacityFactor",
      ),
      markerAtlas: context.getUniformLocation(this._program, "u_markerAtlas"),
    };
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
   * Loads all points data for the given layers, removes GPU resources for
   * points that are no longer needed, and creates or updates the attribute
   * buffers of the remaining ones. Configuration-driven properties (marker,
   * size, color, visibility, opacity) are resolved via the provided maps and
   * table loader; only the properties whose configuration actually changed are
   * resolved again.
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
    markerMaps: GroupValueMap<Marker>[],
    sizeMaps: GroupValueMap<number>[],
    colorMaps: GroupValueMap<Color>[],
    visibilityMaps: GroupValueMap<boolean>[],
    opacityMaps: GroupValueMap<number>[],
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
    const renderedPointsByNewRef = this._cleanRenderedPoints(newRefs);
    this.renderedObjects = await this._createOrUpdateRenderedPoints(
      newRefs,
      renderedPointsByNewRef,
      tables,
      markerMaps,
      sizeMaps,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      loadTable,
      { signal },
    );
    return this.getRenderedBounds();
  }

  /**
   * Issues the WebGL draw calls for all synchronized points
   *
   * Binds the shader program, configures the global uniforms (transform,
   * viewport, canvas size, device pixel ratio), binds the marker atlas texture,
   * and then draws every object in its own `gl.POINTS` call with alpha
   * blending, with its data → world matrix, point size factor and opacity
   * factor as uniforms. Objects whose layer or object is invisible are skipped.
   *
   * @throws Error if the renderer has not been initialized
   */
  draw(): void {
    if (this._markerAtlasTexture === undefined) {
      throw new Error("Not initialized");
    }
    if (this.renderedObjects.length === 0) {
      return;
    }
    this.context.gl.useProgram(this._program);
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
    for (const renderedPoints of this.renderedObjects) {
      const opacityFactor = WebGLPointsRenderer._computeOpacityFactor(
        renderedPoints.ref,
      );
      if (opacityFactor === 0) {
        continue;
      }
      this.context.gl.uniformMatrix3x2fv(
        this._uniformLocations.dataToWorldMatrix,
        false,
        WebGLUtils.convertMatrixToGLMat3x2(
          WebGLUtils.createDataToWorldMatrix(
            renderedPoints.ref.object.transform,
            renderedPoints.ref.layer.transform,
          ),
        ),
      );
      this.context.gl.uniform1f(
        this._uniformLocations.pointSizeFactor,
        WebGLPointsRenderer._computePointSizeFactor(renderedPoints.ref),
      );
      this.context.gl.uniform1f(
        this._uniformLocations.opacityFactor,
        opacityFactor,
      );
      this.context.gl.bindVertexArray(renderedPoints.vao);
      this.context.gl.drawArrays(
        WebGL2RenderingContext.POINTS,
        0,
        renderedPoints.ref.itemIds.length,
      );
    }
    this.context.gl.bindVertexArray(null);
    this.context.disableAlphaBlending();
    this.context.gl.useProgram(null);
  }

  /**
   * Releases the shader program, the marker atlas texture, and all per-object
   * GPU resources
   */
  destroy(): void {
    this.context.gl.deleteProgram(this._program);
    for (const renderedPoints of this.renderedObjects) {
      this._destroyRenderedPoints(renderedPoints);
    }
    if (this._markerAtlasTexture !== undefined) {
      this.context.gl.deleteTexture(this._markerAtlasTexture);
      this._markerAtlasTexture = undefined;
    }
    this.renderedObjects = [];
  }

  /**
   * Removes the GPU resources of points objects that are no longer referenced
   *
   * Matches the rendered objects to the new set of references, by layer,
   * object, contributed items and data source. Those that still match are
   * returned for reuse, and adopt the new reference, as the uniforms are read
   * from it when drawing; the rest have their buffers destroyed. Every
   * reference is matched at most once, so that duplicates are destroyed rather
   * than orphaned.
   *
   * @param newRefs - The object references to match against
   * @returns The reusable rendered objects, by object reference
   */
  private _cleanRenderedPoints(
    newRefs: PointsRef[],
  ): Map<PointsRef, RenderedPoints> {
    const renderedPointsByNewRef = new Map<PointsRef, RenderedPoints>();
    for (let i = 0; i < this.renderedObjects.length; i++) {
      const renderedPoints = this.renderedObjects[i]!;
      const newRef = newRefs.find(
        (newRef) =>
          !renderedPointsByNewRef.has(newRef) &&
          renderedPoints.ref.layer.id === newRef.layer.id &&
          renderedPoints.ref.object.id === newRef.object.id &&
          renderedPoints.ref.itemIds === newRef.itemIds &&
          renderedPoints.ref.itemsMask === newRef.itemsMask &&
          // check data source configuration instead of data
          deepEqual(renderedPoints.state.dataSource, newRef.object.dataSource),
      );
      if (newRef !== undefined) {
        renderedPoints.ref = newRef;
        renderedPointsByNewRef.set(newRef, renderedPoints);
      } else {
        const [renderedPoints] = this.renderedObjects.splice(i, 1);
        this._destroyRenderedPoints(renderedPoints!);
        i--;
      }
    }
    return renderedPointsByNewRef;
  }

  /**
   * Creates new GPU resources for points that have no existing render pass, or
   * updates existing ones when the model state has changed
   *
   * The geometry is loaded for new objects only: a reused object is known to
   * have the same items and data source (see {@link _cleanRenderedPoints}).
   * Marker, size and color buffers are re-uploaded when their configurations
   * change. Whatever has to be resolved is resolved concurrently, and every
   * object's buffers are uploaded in one synchronous block once all of its
   * inputs are available, so a draw in between never sees a partially updated
   * object. New objects are added to the rendered objects as soon as their
   * buffers exist, so an aborted synchronization leaves no orphaned resources.
   *
   * Runs in two passes. The first decides for every object what has to be
   * loaded and requests all of it - the geometry, and the resolved marker,
   * size and color buffers - while the second awaits those requests in order
   * and uploads them.
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
   * @param newRefs - The objects to create or update GPU resources for
   * @param renderedPointsByNewRef - The reusable GPU resources, by object
   * @param tables - Tables that the objects resolve their properties from
   * @param markerMaps - Project-global marker maps
   * @param sizeMaps - Project-global size maps
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   * @returns The new ordered list of rendered objects
   */
  private async _createOrUpdateRenderedPoints(
    newRefs: PointsRef[],
    renderedPointsByNewRef: Map<PointsRef, RenderedPoints>,
    tables: Table[],
    markerMaps: GroupValueMap<Marker>[],
    sizeMaps: GroupValueMap<number>[],
    colorMaps: GroupValueMap<Color>[],
    visibilityMaps: GroupValueMap<boolean>[],
    opacityMaps: GroupValueMap<number>[],
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
      geometryPromise: Promise<PointsGeometry> | undefined;
      packedPointMarkersPromise: Promise<Uint8Array> | undefined;
      packedPointSizesPromise: Promise<Float32Array> | undefined;
      packedPointColorsPromise: Promise<Uint32Array> | undefined;
      packedPointVisibilitiesPromise: Promise<Uint8Array> | undefined;
      packedPointOpacitiesPromise: Promise<Uint8Array> | undefined;
    }[] = [];
    for (const newRef of newRefs) {
      const renderedPoints = renderedPointsByNewRef.get(newRef);
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
      const geometryPromise =
        renderedPoints === undefined
          ? newRef.data.loadGeometry({ signal })
          : undefined;
      geometryPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedPointMarkersPromise =
        WebGLPointsRenderer._checkPointMarkerBufferChanged(
          renderedPoints,
          newRef,
        )
          ? WebGLPointsRenderer._resolvePointMarkers(newRef, markerMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      packedPointMarkersPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedPointSizesPromise =
        WebGLPointsRenderer._checkPointSizeBufferChanged(renderedPoints, newRef)
          ? WebGLPointsRenderer._resolvePointSizes(newRef, sizeMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      packedPointSizesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedPointColorsPromise =
        WebGLPointsRenderer._checkPointColorBufferChanged(
          renderedPoints,
          newRef,
        )
          ? WebGLPointsRenderer._resolvePointColors(newRef, colorMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      packedPointColorsPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedPointVisibilitiesPromise =
        WebGLPointsRenderer._checkPointColorBufferChanged(
          renderedPoints,
          newRef,
        )
          ? WebGLPointsRenderer._resolvePointVisibilities(
              newRef,
              visibilityMaps,
              {
                signal,
                loadTable: loadObjectTable,
              },
            )
          : undefined;
      packedPointVisibilitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedPointOpacitiesPromise =
        WebGLPointsRenderer._checkPointColorBufferChanged(
          renderedPoints,
          newRef,
        )
          ? WebGLPointsRenderer._resolvePointOpacities(newRef, opacityMaps, {
              signal,
              loadTable: loadObjectTable,
            })
          : undefined;
      packedPointOpacitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      objectPreloads.push({
        newRef,
        renderedPoints,
        geometryPromise,
        packedPointMarkersPromise,
        packedPointSizesPromise,
        packedPointColorsPromise,
        packedPointVisibilitiesPromise,
        packedPointOpacitiesPromise,
      });
    }
    const newRenderedPoints: RenderedPoints[] = [];
    for (const {
      newRef,
      renderedPoints,
      geometryPromise,
      packedPointMarkersPromise,
      packedPointSizesPromise,
      packedPointColorsPromise,
      packedPointVisibilitiesPromise,
      packedPointOpacitiesPromise,
    } of objectPreloads) {
      const [
        geometry,
        packedPointMarkers,
        packedPointSizes,
        packedPointColors,
        packedPointVisibilities,
        packedPointOpacities,
      ] = await Promise.all([
        geometryPromise,
        packedPointMarkersPromise,
        packedPointSizesPromise,
        packedPointColorsPromise,
        packedPointVisibilitiesPromise,
        packedPointOpacitiesPromise,
      ]);
      signal?.throwIfAborted();
      let maskedGeometry: PointsGeometry | undefined;
      let objectBounds: Rect;
      if (geometry !== undefined) {
        let { xs, ys } = geometry;
        const pointsMask = newRef.itemsMask;
        if (pointsMask !== undefined) {
          xs = xs.filter((_, j) => pointsMask[j]! > 0);
          ys = ys.filter((_, j) => pointsMask[j]! > 0);
        }
        maskedGeometry = { xs, ys };
        objectBounds = await WebGLPointsRenderer._getObjectBounds(
          maskedGeometry,
          { signal },
        );
      } else if (renderedPoints !== undefined) {
        objectBounds = renderedPoints.objectBounds;
      } else {
        throw new Error("Geometry must be loaded for new points object");
      }
      if (
        packedPointColors !== undefined &&
        packedPointVisibilities !== undefined &&
        packedPointOpacities !== undefined
      ) {
        await AsyncUtils.forEach(
          packedPointColors,
          (packedPointColor, i) => {
            packedPointColors[i] = ColorUtils.withAlpha(
              packedPointColor,
              packedPointVisibilities[i]!,
              packedPointOpacities[i]!,
            );
          },
          { signal },
        );
      }
      // no awaits from here on, so that the object is uploaded atomically
      const state = {
        dataSource: structuredClone(newRef.object.dataSource),
        pointMarker: structuredClone(newRef.object.pointMarker),
        pointSize: structuredClone(newRef.object.pointSize),
        pointColor: structuredClone(newRef.object.pointColor),
        pointVisibility: structuredClone(newRef.object.pointVisibility),
        pointOpacity: structuredClone(newRef.object.pointOpacity),
      };
      let currentRenderedPoints: RenderedPoints;
      if (renderedPoints === undefined) {
        if (
          maskedGeometry === undefined ||
          packedPointMarkers === undefined ||
          packedPointSizes === undefined ||
          packedPointColors === undefined
        ) {
          throw new Error(
            "All attributes must be resolved for new points object",
          );
        }
        currentRenderedPoints = {
          ref: newRef,
          state,
          objectBounds,
          ...this._createBuffers(newRef.itemIds.length),
        };
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          currentRenderedPoints.buffers.x,
          maskedGeometry.xs,
        );
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          currentRenderedPoints.buffers.y,
          maskedGeometry.ys,
        );
        this.renderedObjects.push(currentRenderedPoints);
      } else {
        currentRenderedPoints = renderedPoints;
        currentRenderedPoints.state = state;
      }
      if (packedPointMarkers !== undefined) {
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          currentRenderedPoints.buffers.marker,
          packedPointMarkers,
        );
      }
      if (packedPointSizes !== undefined) {
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          currentRenderedPoints.buffers.size,
          packedPointSizes,
        );
      }
      if (packedPointColors !== undefined) {
        this.context.loadBuffer(
          WebGL2RenderingContext.ARRAY_BUFFER,
          currentRenderedPoints.buffers.color,
          packedPointColors,
        );
      }
      newRenderedPoints.push(currentRenderedPoints);
    }
    return newRenderedPoints;
  }

  /**
   * Creates the vertex array and attribute buffers for an object of `n` points
   *
   * The buffers are allocated but not filled.
   *
   * @param n - Number of points of the object
   * @returns The vertex array and the attribute buffers it is configured with
   */
  private _createBuffers(n: number): Pick<RenderedPoints, "vao" | "buffers"> {
    const buffers = {
      x: this.context.createBuffer(),
      y: this.context.createBuffer(),
      size: this.context.createBuffer(),
      color: this.context.createBuffer(),
      marker: this.context.createBuffer(),
    };
    const vao = this.context.createVertexArray();
    this.context.gl.bindVertexArray(vao);
    this.context.configureVertexFloatAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.x,
      WebGLPointsRenderer._attribLocations.X,
      1,
      WebGL2RenderingContext.FLOAT,
    );
    this.context.configureVertexFloatAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.y,
      WebGLPointsRenderer._attribLocations.Y,
      1,
      WebGL2RenderingContext.FLOAT,
    );
    this.context.configureVertexFloatAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.size,
      WebGLPointsRenderer._attribLocations.SIZE,
      1,
      WebGL2RenderingContext.FLOAT,
    );
    this.context.configureVertexIntAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.color,
      WebGLPointsRenderer._attribLocations.COLOR,
      1,
      WebGL2RenderingContext.UNSIGNED_INT,
    );
    this.context.configureVertexIntAttribute(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.marker,
      WebGLPointsRenderer._attribLocations.MARKER,
      1,
      WebGL2RenderingContext.UNSIGNED_BYTE,
    );
    this.context.gl.bindVertexArray(null);
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.x,
      n * Float32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.y,
      n * Float32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.size,
      n * Float32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.color,
      n * Uint32Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.resizeBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.marker,
      n * Uint8Array.BYTES_PER_ELEMENT,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    return { vao, buffers };
  }

  /**
   * Deletes the vertex array and all attribute buffers owned by a single
   * rendered object
   */
  private _destroyRenderedPoints(renderedPoints: RenderedPoints): void {
    this.context.gl.deleteVertexArray(renderedPoints.vao);
    for (const buffer of Object.values(renderedPoints.buffers)) {
      this.context.gl.deleteBuffer(buffer);
    }
  }

  /**
   * Computes the axis-aligned bounding box of the given points in data coordinates
   *
   * @param geometry - X and Y coordinates of the points, in data coordinates
   * @param options - Optional abort signal
   * @returns The axis-aligned bounding box of the points in data coordinates
   * @throws Error if the coordinate arrays are empty or have different lengths
   */
  private static async _getObjectBounds(
    geometry: PointsGeometry,
    options?: { signal?: AbortSignal },
  ): Promise<Rect> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { xs, ys } = geometry;
    if (xs.length === 0 || ys.length === 0) {
      throw new Error("Coordinate arrays must not be empty");
    }
    if (xs.length !== ys.length) {
      throw new Error("Coordinate arrays must have the same length");
    }
    const [xMin, xMax] = await MathUtils.computeRange(xs, { signal });
    const [yMin, yMax] = await MathUtils.computeRange(ys, { signal });
    return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
  }

  /**
   * Computes the factor that converts the sizes of an object to world units
   *
   * Multiplies the object- and layer-level point size factors with the
   * transform scales that the unit of the size configuration is subject to:
   * sizes in data units scale with the object and layer transforms, sizes in
   * layer units with the layer transform only, and sizes in world units with
   * neither.
   */
  private static _computePointSizeFactor(ref: PointsRef): number {
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
    return sizeFactor;
  }

  /**
   * Computes the factor that the alpha of every point of an object is
   * multiplied with
   *
   * @returns The product of the layer and object opacities, or `0` if the
   * layer or the object is invisible
   */
  private static _computeOpacityFactor(ref: PointsRef): number {
    if (ref.layer.visibility === false || ref.object.visibility === false) {
      return 0;
    }
    return ref.layer.opacity * ref.object.opacity;
  }

  /**
   * Returns whether the markers of an object have to be resolved again
   *
   * Also true for an object that has not been rendered yet, like the other
   * predicates.
   */
  private static _checkPointMarkerBufferChanged(
    renderedPoints: RenderedPoints | undefined,
    newRef: PointsRef,
  ): boolean {
    return (
      renderedPoints === undefined ||
      !deepEqual(renderedPoints.state.pointMarker, newRef.object.pointMarker)
    );
  }

  /**
   * Returns whether the sizes of an object have to be resolved again
   *
   * The point size factors and transform scales are shader uniforms (see
   * {@link _computePointSizeFactor}), so only the point size configuration
   * matters here.
   */
  private static _checkPointSizeBufferChanged(
    renderedPoints: RenderedPoints | undefined,
    newRef: PointsRef,
  ): boolean {
    return (
      renderedPoints === undefined ||
      !deepEqual(renderedPoints.state.pointSize, newRef.object.pointSize)
    );
  }

  /**
   * Returns whether the colors of an object have to be resolved again
   *
   * Colors carry the resolved point visibilities and opacities in their alpha
   * channel, so they also depend on those configurations. The layer- and
   * object-level visibility and opacity are shader uniforms (see
   * {@link _computeOpacityFactor}) and do not matter here.
   *
   * @todo Changes to the color, visibility and opacity maps themselves are not
   * detected; they are only re-read when a configuration referencing them
   * changes.
   */
  private static _checkPointColorBufferChanged(
    renderedPoints: RenderedPoints | undefined,
    newRef: PointsRef,
  ): boolean {
    return (
      renderedPoints === undefined ||
      !deepEqual(
        renderedPoints.state.pointVisibility,
        newRef.object.pointVisibility,
      ) ||
      !deepEqual(
        renderedPoints.state.pointOpacity,
        newRef.object.pointOpacity,
      ) ||
      !deepEqual(renderedPoints.state.pointColor, newRef.object.pointColor)
    );
  }

  /**
   * Resolves the marker of every point of an object
   *
   * @param options - Optional abort signal and table loader
   */
  private static _resolvePointMarkers(
    ref: PointsRef,
    markerMaps: GroupValueMap<Marker>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    return MarkerResolver.resolveMarkers(
      ref.itemIds,
      ref.object.pointMarker,
      markerMaps,
      defaultPointMarker,
      options,
    );
  }

  /**
   * Resolves the size of every point of an object
   *
   * The sizes are resolved as configured, in the unit of the size
   * configuration; {@link _computePointSizeFactor} converts them to world units
   * in the shader.
   *
   * @param options - Optional abort signal and table loader
   */
  private static _resolvePointSizes(
    ref: PointsRef,
    sizeMaps: GroupValueMap<number>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Float32Array> {
    return SizeResolver.resolveSizes(
      ref.itemIds,
      ref.object.pointSize,
      sizeMaps,
      defaultPointSize,
      options,
    );
  }

  /**
   * Resolves the RGB color of every point of an object
   *
   * The alpha channel is added later, by
   * {@link ColorUtils.withAlpha}, from the separately resolved
   * visibilities and opacities.
   *
   * @param options - Optional abort signal and table loader
   * @returns The packed colors, one per point, without alpha
   */
  private static _resolvePointColors(
    ref: PointsRef,
    colorMaps: GroupValueMap<Color>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint32Array> {
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
  private static _resolvePointVisibilities(
    ref: PointsRef,
    visibilityMaps: GroupValueMap<boolean>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
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
   * The layer- and object-level opacities are not multiplied in here, they are
   * a shader uniform (see {@link _computeOpacityFactor}).
   *
   * @param options - Optional abort signal and table loader
   * @returns The alpha values, one per point
   */
  private static _resolvePointOpacities(
    ref: PointsRef,
    opacityMaps: GroupValueMap<number>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    return OpacityResolver.resolveOpacities(
      ref.itemIds,
      ref.object.pointOpacity,
      opacityMaps,
      defaultPointOpacity,
      options,
    );
  }
}

/**
 * A reference to a points object, its layer, and its loaded data
 */
type PointsRef = ObjectRef<Points, PointsData>;

/**
 * GPU state for a single points object
 *
 * Holds the vertex array and the attribute buffers it is configured with, plus
 * a snapshot of the model values the buffers were loaded from, which the change
 * predicates compare against: every property they read has to be captured in
 * it. Layer- and object-level properties are read from the reference when
 * drawing, and are not part of the snapshot.
 */
type RenderedPoints = RenderedObjectBase<Points, PointsData> & {
  state: Pick<
    Points,
    | "dataSource"
    | "pointMarker"
    | "pointSize"
    | "pointColor"
    | "pointVisibility"
    | "pointOpacity"
  >;
  vao: WebGLVertexArrayObject;
  buffers: {
    x: WebGLBuffer;
    y: WebGLBuffer;
    size: WebGLBuffer;
    color: WebGLBuffer;
    marker: WebGLBuffer;
  };
};
