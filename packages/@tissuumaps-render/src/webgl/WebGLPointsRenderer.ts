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
  type SizeConfig,
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
  projectDefaults,
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
 * compares the current model against the snapshot those buffers were loaded
 * from, and re-uploads only the attributes whose inputs changed.
 * Layer- and object-level properties (transforms, point size factors,
 * visibility and opacity) are shader uniforms, so changing them never touches
 * the buffers, and never requires a synchronization (see
 * {@link WebGLRendererBase.setModel}).
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
  private static readonly _textureUnits = {
    MARKER_ATLAS: 0,
  };

  renderOptions: WebGLPointsRenderOptions =
    projectDefaults.glOptions.pointsRenderOptions;
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
  };
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
   * @param options - Optional abort signal
   */
  constructor(
    context: WebGLContext,
    onInitialized: () => void,
    onError: (error: Error) => void,
    options?: { signal?: AbortSignal },
  ) {
    super(context);
    const { signal } = options ?? {};
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
    };
    // texture units never change, so the sampler uniforms are set only once
    context.gl.useProgram(this._program);
    context.gl.uniform1i(
      context.getUniformLocation(this._program, "u_markerAtlas"),
      WebGLPointsRenderer._textureUnits.MARKER_ATLAS,
    );
    context.gl.useProgram(null);
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
   * Synchronizes GPU buffers with the current model state
   *
   * Loads all points data of the model set by {@link setModel}, removes GPU
   * resources for points that are no longer needed, and creates or updates the
   * attribute buffers of the remaining ones. Configuration-driven properties
   * (marker, size, color, visibility, opacity) are resolved via the provided
   * maps and table loader; only the properties whose configuration actually
   * changed are resolved again.
   *
   * @param tables - Tables that the points objects resolve their properties from
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
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    this.recordSyncState();
    const newRefs = await this.loadObjects(tables, loadPoints, loadTable, {
      signal,
    });
    const matches = this.matchOrDestroyRenderedObjects(newRefs);
    await this._createOrUpdateRenderedPoints(
      matches,
      tables,
      markerMaps,
      sizeMaps,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      loadTable,
      { signal },
    );
  }

  /**
   * Issues the WebGL draw calls for all synchronized points
   *
   * Binds the shader program, configures the global uniforms (transform,
   * viewport, canvas size, device pixel ratio), binds the marker atlas texture,
   * and then draws every object in its own `gl.POINTS` call with alpha
   * blending, with its data → world matrix, point size factor and opacity
   * factor as uniforms, computed from the current model (see
   * {@link getRenderPasses}). Objects whose layer or object is invisible are
   * skipped.
   *
   * @throws Error if the renderer has not been initialized
   */
  draw(): void {
    if (this._markerAtlasTexture === undefined) {
      throw new Error("Not initialized");
    }
    const renderPasses = this.getRenderPasses();
    if (renderPasses.length === 0) {
      return;
    }
    this.context.gl.useProgram(this._program);
    this.context.gl.uniform1f(
      this._uniformLocations.globalPointSizeFactor,
      this.renderOptions.globalPointSizeFactor,
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
    this.context.gl.activeTexture(
      WebGL2RenderingContext.TEXTURE0 +
        WebGLPointsRenderer._textureUnits.MARKER_ATLAS,
    );
    this.context.gl.bindTexture(
      WebGL2RenderingContext.TEXTURE_2D,
      this._markerAtlasTexture,
    );
    this.context.enableAlphaBlending();
    for (const {
      layer,
      object: points,
      renderedObject: renderedPoints,
    } of renderPasses) {
      const opacityFactor = WebGLPointsRenderer.computeOpacityFactor(
        layer,
        points,
      );
      if (opacityFactor === 0) {
        continue;
      }
      this.context.gl.uniformMatrix3x2fv(
        this._uniformLocations.dataToWorldMatrix,
        false,
        WebGLUtils.convertMatrixToGLMat3x2(
          WebGLUtils.createDataToWorldMatrix(points.transform, layer.transform),
        ),
      );
      this.context.gl.uniform1f(
        this._uniformLocations.pointSizeFactor,
        WebGLPointsRenderer._computePointSizeFactor(layer, points),
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
    if (this._markerAtlasTexture !== undefined) {
      this.context.gl.deleteTexture(this._markerAtlasTexture);
      this._markerAtlasTexture = undefined;
    }
    this.clearRenderedObjects();
  }

  /**
   * Returns the state of a points object that a synchronization depends on
   *
   * Blanks out the object-level point size factor, and the units of the point
   * size configuration, on top of what the base class blanks out: the sizes are
   * uploaded without their unit, which is applied as part of the point size
   * factor uniform instead (see {@link _computePointSizeFactor}).
   *
   * @param points - The points object to return the state of
   * @returns The points object without the properties that are applied when drawing
   */
  protected override getObjectSyncState(points: Points): object {
    return {
      ...super.getObjectSyncState(points),
      pointSizeFactor: undefined,
      pointSize: WebGLPointsRenderer._stripSizeUnit(points.pointSize),
    };
  }

  /**
   * Deletes the vertex array and all attribute buffers owned by a single
   * rendered object
   */
  protected override destroyRenderedObject(
    renderedPoints: RenderedPoints,
  ): void {
    this.context.gl.deleteVertexArray(renderedPoints.vao);
    for (const buffer of Object.values(renderedPoints.buffers)) {
      this.context.gl.deleteBuffer(buffer);
    }
  }

  /**
   * Creates new GPU resources for points that have no rendered object yet, or
   * updates existing ones when the model state has changed
   *
   * Runs in two passes. The first prepares every object (see
   * {@link _prepareRenderedPoints}), issuing all requests before the first
   * `await`. The second awaits the preparations in order and uploads them, each
   * in one synchronous block, so a draw in between never sees a half-updated
   * object. New objects join the rendered objects as soon as their buffers
   * exist, so an aborted synchronization leaves nothing orphaned.
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
   * An object whose preparation fails is logged and dropped, like an object
   * whose data fails to load (see {@link loadObjects}); the other objects are
   * unaffected.
   *
   * @param matches - The objects to create or update GPU resources for, in draw
   * order, each with the rendered points to reuse for it, if any
   * @param tables - Tables that the objects resolve their properties from
   * @param markerMaps - Project-global marker maps
   * @param sizeMaps - Project-global size maps
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   */
  private async _createOrUpdateRenderedPoints(
    matches: {
      newRef: PointsRef;
      renderedObject: RenderedPoints | undefined;
    }[],
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
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const preloads = matches.map(
      ({ newRef, renderedObject: renderedPoints }) => {
        const preparedPromise = WebGLPointsRenderer._prepareRenderedPoints(
          newRef,
          renderedPoints,
          markerMaps,
          sizeMaps,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          WebGLPointsRenderer.createObjectTableLoader(
            newRef,
            tables,
            loadTable,
          ),
          { signal },
        );
        preparedPromise.catch(() => {}); // prevent unhandled rejections in console
        return { newRef, renderedPoints, preparedPromise };
      },
    );
    for (const { newRef, renderedPoints, preparedPromise } of preloads) {
      let prepared;
      try {
        prepared = await preparedPromise;
      } catch (error) {
        signal?.throwIfAborted();
        console.error(
          `Failed to prepare points object with ID '${newRef.object.id}'`,
          error,
        );
        if (renderedPoints !== undefined) {
          this.removeRenderedObject(renderedPoints);
        }
        continue;
      }
      signal?.throwIfAborted();
      // no awaits from here on, so that the object is uploaded atomically
      const renderConfigSnapshot = {
        pointMarker: newRef.object.pointMarker,
        pointSize: WebGLPointsRenderer._stripSizeUnit(newRef.object.pointSize),
        pointColor: newRef.object.pointColor,
        pointVisibility: newRef.object.pointVisibility,
        pointOpacity: newRef.object.pointOpacity,
      };
      if (renderedPoints === undefined) {
        if (
          prepared.maskedGeometry === undefined ||
          prepared.packedPointMarkers === undefined ||
          prepared.packedPointSizes === undefined ||
          prepared.packedPointColors === undefined
        ) {
          throw new Error(
            "All attributes must be resolved for new points object",
          );
        }
        this.addRenderedObject({
          ref: newRef,
          renderConfigSnapshot,
          objectBounds: prepared.objectBounds,
          ...this._createBuffers(
            prepared.maskedGeometry,
            prepared.packedPointMarkers,
            prepared.packedPointSizes,
            prepared.packedPointColors,
          ),
        });
      } else {
        renderedPoints.renderConfigSnapshot = renderConfigSnapshot;
        if (prepared.packedPointMarkers !== undefined) {
          this.context.loadBuffer(
            WebGL2RenderingContext.ARRAY_BUFFER,
            renderedPoints.buffers.marker,
            prepared.packedPointMarkers,
          );
        }
        if (prepared.packedPointSizes !== undefined) {
          this.context.loadBuffer(
            WebGL2RenderingContext.ARRAY_BUFFER,
            renderedPoints.buffers.size,
            prepared.packedPointSizes,
          );
        }
        if (prepared.packedPointColors !== undefined) {
          this.context.loadBuffer(
            WebGL2RenderingContext.ARRAY_BUFFER,
            renderedPoints.buffers.color,
            prepared.packedPointColors,
          );
        }
      }
    }
  }

  /**
   * Prepares everything that has to be uploaded for an object
   *
   * Decides what the object's buffers need - the geometry for a new object,
   * and the resolved markers, sizes and colors whose configurations changed -
   * requests all of it before the first `await`, and then computes the bounds
   * and folds the resolved visibilities and opacities into the colors.
   *
   * Must be called synchronously for every object of a synchronization, see
   * {@link _createOrUpdateRenderedPoints}.
   *
   * @param newRef - The object to prepare
   * @param renderedPoints - The object's current GPU state, if it is reused
   * @param markerMaps - Project-global marker maps
   * @param sizeMaps - Project-global size maps
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadTable - Loader for the object's table, if any
   * @param options - Optional abort signal
   * @returns The masked geometry (new objects only), the bounds, and the
   * resolved attributes that have to be uploaded
   */
  private static async _prepareRenderedPoints(
    newRef: PointsRef,
    renderedPoints: RenderedPoints | undefined,
    markerMaps: GroupValueMap<Marker>[],
    sizeMaps: GroupValueMap<number>[],
    colorMaps: GroupValueMap<Color>[],
    visibilityMaps: GroupValueMap<boolean>[],
    opacityMaps: GroupValueMap<number>[],
    loadTable:
      ((options?: { signal?: AbortSignal }) => Promise<TableData>) | undefined,
    options?: { signal?: AbortSignal },
  ): Promise<{
    objectBounds: Rect;
    maskedGeometry: PointsGeometry | undefined;
    packedPointMarkers: Uint8Array | undefined;
    packedPointSizes: Float32Array | undefined;
    packedPointColors: Uint32Array | undefined;
  }> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const pointMarkerBufferChanged =
      WebGLPointsRenderer._checkPointMarkerBufferChanged(
        renderedPoints,
        newRef,
      );
    const pointSizeBufferChanged =
      WebGLPointsRenderer._checkPointSizeBufferChanged(renderedPoints, newRef);
    const pointColorBufferChanged =
      WebGLPointsRenderer._checkPointColorBufferChanged(renderedPoints, newRef);
    const geometryPromise =
      renderedPoints === undefined
        ? newRef.data.loadGeometry({ signal })
        : undefined;
    const packedPointMarkersPromise = pointMarkerBufferChanged
      ? MarkerResolver.resolveMarkers(
          newRef.itemIds,
          newRef.object.pointMarker,
          markerMaps,
          defaultPointMarker,
          { signal, loadTable },
        )
      : undefined;
    const packedPointSizesPromise = pointSizeBufferChanged
      ? SizeResolver.resolveSizes(
          newRef.itemIds,
          newRef.object.pointSize,
          sizeMaps,
          defaultPointSize,
          { signal, loadTable },
        )
      : undefined;
    const packedPointColorsPromise = pointColorBufferChanged
      ? ColorResolver.resolveColors(
          newRef.itemIds,
          newRef.object.pointColor,
          colorMaps,
          defaultPointColor,
          { signal, loadTable },
        )
      : undefined;
    const packedPointVisibilitiesPromise = pointColorBufferChanged
      ? VisibilityResolver.resolveVisibilities(
          newRef.itemIds,
          newRef.object.pointVisibility,
          visibilityMaps,
          defaultPointVisibility,
          { signal, loadTable },
        )
      : undefined;
    const packedPointOpacitiesPromise = pointColorBufferChanged
      ? OpacityResolver.resolveOpacities(
          newRef.itemIds,
          newRef.object.pointOpacity,
          opacityMaps,
          defaultPointOpacity,
          { signal, loadTable },
        )
      : undefined;
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
    return {
      maskedGeometry,
      objectBounds,
      packedPointMarkers,
      packedPointSizes,
      packedPointColors,
    };
  }

  /**
   * Creates the vertex array and attribute buffers of an object, filled with
   * the given attributes
   *
   * @param geometry - X and Y coordinates of the points, in data coordinates
   * @param packedPointMarkers - The marker index of every point
   * @param packedPointSizes - The size of every point
   * @param packedPointColors - The packed RGBA color of every point
   * @returns The vertex array and the attribute buffers it is configured with
   */
  private _createBuffers(
    geometry: PointsGeometry,
    packedPointMarkers: Uint8Array,
    packedPointSizes: Float32Array,
    packedPointColors: Uint32Array,
  ): Pick<RenderedPoints, "vao" | "buffers"> {
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
    this.context.allocateBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.x,
      geometry.xs,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.allocateBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.y,
      geometry.ys,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.allocateBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.size,
      packedPointSizes,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.allocateBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.color,
      packedPointColors,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    this.context.allocateBuffer(
      WebGL2RenderingContext.ARRAY_BUFFER,
      buffers.marker,
      packedPointMarkers,
      WebGL2RenderingContext.STATIC_DRAW,
    );
    return { vao, buffers };
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
   *
   * @param layer - The layer the points are drawn on, as of the current model
   * @param points - The points object being drawn, as of the current model
   */
  private static _computePointSizeFactor(layer: Layer, points: Points): number {
    let activeUnit: CoordinateSpace;
    const activeSource = getActiveConfigSource(points.pointSize);
    if (activeSource === "constant" && isConstantConfig(points.pointSize)) {
      activeUnit = points.pointSize.constant.unit ?? defaultPointSizeUnit;
    } else if (activeSource === "from" && isFromConfig(points.pointSize)) {
      activeUnit = points.pointSize.from.unit ?? defaultPointSizeUnit;
    } else if (
      activeSource === "groupBy" &&
      isGroupByConfig(points.pointSize)
    ) {
      activeUnit = points.pointSize.groupBy.unit ?? defaultPointSizeUnit;
    } else {
      activeUnit = defaultPointSizeUnit;
    }
    let sizeFactor = points.pointSizeFactor * layer.pointSizeFactor;
    if (activeUnit === "data") {
      sizeFactor *= points.transform.scale;
    }
    if (activeUnit === "data" || activeUnit === "layer") {
      sizeFactor *= layer.transform.scale;
    }
    return sizeFactor;
  }

  /**
   * Copies a size configuration without its units
   *
   * The unit only affects {@link _computePointSizeFactor}, not the resolved
   * sizes, so it is left out of the snapshot that
   * {@link _checkPointSizeBufferChanged} compares.
   */
  private static _stripSizeUnit(config: SizeConfig): SizeConfig {
    const stripped = structuredClone(config);
    if (isConstantConfig<number, { unit?: CoordinateSpace }>(stripped)) {
      delete stripped.constant.unit;
    }
    if (isFromConfig<{ unit?: CoordinateSpace }>(stripped)) {
      delete stripped.from.unit;
    }
    if (isGroupByConfig<true, { unit?: CoordinateSpace }>(stripped)) {
      delete stripped.groupBy.unit;
    }
    return stripped;
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
      !deepEqual(
        renderedPoints.renderConfigSnapshot.pointMarker,
        newRef.object.pointMarker,
      )
    );
  }

  /**
   * Returns whether the sizes of an object have to be resolved again
   *
   * The point size factors, transform scales and size units are shader
   * uniforms (see {@link _computePointSizeFactor}), so only the rest of the
   * point size configuration matters here.
   */
  private static _checkPointSizeBufferChanged(
    renderedPoints: RenderedPoints | undefined,
    newRef: PointsRef,
  ): boolean {
    return (
      renderedPoints === undefined ||
      !deepEqual(
        renderedPoints.renderConfigSnapshot.pointSize,
        WebGLPointsRenderer._stripSizeUnit(newRef.object.pointSize),
      )
    );
  }

  /**
   * Returns whether the colors of an object have to be resolved again
   *
   * Colors carry the resolved point visibilities and opacities in their alpha
   * channel, so they also depend on those configurations. The layer- and
   * object-level visibility and opacity are shader uniforms (see
   * {@link WebGLRendererBase.computeOpacityFactor}) and do not matter here.
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
        renderedPoints.renderConfigSnapshot.pointVisibility,
        newRef.object.pointVisibility,
      ) ||
      !deepEqual(
        renderedPoints.renderConfigSnapshot.pointOpacity,
        newRef.object.pointOpacity,
      ) ||
      !deepEqual(
        renderedPoints.renderConfigSnapshot.pointColor,
        newRef.object.pointColor,
      )
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
 * it. Layer- and object-level properties are read from the current model when
 * drawing (see {@link WebGLRendererBase.getRenderPasses}), and are not part of
 * the snapshot.
 */
type RenderedPoints = RenderedObjectBase<Points, PointsData> & {
  vao: WebGLVertexArrayObject;
  buffers: {
    x: WebGLBuffer;
    y: WebGLBuffer;
    size: WebGLBuffer;
    color: WebGLBuffer;
    marker: WebGLBuffer;
  };
  renderConfigSnapshot: Pick<
    Points,
    | "pointMarker"
    | "pointSize"
    | "pointColor"
    | "pointVisibility"
    | "pointOpacity"
  >;
};
