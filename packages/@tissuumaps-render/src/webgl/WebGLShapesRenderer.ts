import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  type Color,
  ColorUtils,
  type GroupValueMap,
  type Rect,
  type Shapes,
  type ShapesData,
  type ShapesGeometry,
  type Table,
  type TableData,
  type WebGLShapesRenderOptions,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
  projectDefaults,
} from "@tissuumaps/core";

import shapesFragmentShader from "../assets/shaders/shapes.frag?raw";
import shapesVertexShader from "../assets/shaders/shapes.vert?raw";
import { ColorResolver } from "../resolvers/ColorResolver";
import { OpacityResolver } from "../resolvers/OpacityResolver";
import { VisibilityResolver } from "../resolvers/VisibilityResolver";
import type { WebGLContext } from "./WebGLContext";
import {
  type ObjectRef,
  type RenderedObjectBase,
  WebGLRendererBase,
} from "./WebGLRendererBase";
import { WebGLShapesRasterizer } from "./WebGLShapesRasterizer";
import { WebGLUtils } from "./WebGLUtils";

/**
 * WebGL renderer for two-dimensional shape clouds
 *
 * Shapes are rasterized on the GPU via a scanline-based algorithm. Each shapes
 * object is represented by a full-screen quad whose fragment shader samples a
 * scanline data texture to determine polygon membership, fill colors, and
 * stroke colors.
 *
 * Every object owns its textures. Synchronizing compares the current model
 * against the snapshot those textures were built from, and rebuilds only the
 * ones whose inputs changed. Layer- and object-level properties (transforms,
 * visibility and opacity) are shader uniforms, so changing them never touches
 * the textures, and never requires a synchronization (see
 * {@link WebGLRendererBase.setModel}).
 */
export class WebGLShapesRenderer extends WebGLRendererBase<
  Shapes,
  ShapesData,
  RenderedShapes
> {
  private static readonly _scanlineDataTextureWidth = 4096; // see fragment shader
  private static readonly _shapeColorsTextureWidth = 4096; // see fragment shader
  private static readonly _textureUnits = {
    SCANLINE_DATA: 1, // unit 0 is used by the points renderer
    SHAPE_FILL_COLORS: 2,
    SHAPE_STROKE_COLORS: 3,
  };

  renderOptions: WebGLShapesRenderOptions =
    projectDefaults.glOptions.shapesRenderOptions;
  private readonly _program: WebGLProgram;
  private readonly _uniformLocations: {
    viewportToWorldMatrix: WebGLUniformLocation;
    worldToDataMatrix: WebGLUniformLocation;
    strokeWidth: WebGLUniformLocation;
    numScanlines: WebGLUniformLocation;
    objectBounds: WebGLUniformLocation;
    opacityFactor: WebGLUniformLocation;
  };

  /**
   * Creates the shader program and retrieves uniform locations
   *
   * @param context - The WebGL context to use for rendering
   */
  constructor(context: WebGLContext) {
    super(context);
    this._program = context.createProgram(
      shapesVertexShader,
      shapesFragmentShader,
    );
    this._uniformLocations = {
      viewportToWorldMatrix: context.getUniformLocation(
        this._program,
        "u_viewportToWorldMatrix",
      ),
      worldToDataMatrix: context.getUniformLocation(
        this._program,
        "u_worldToDataMatrix",
      ),
      strokeWidth: context.getUniformLocation(this._program, "u_strokeWidth"),
      numScanlines: context.getUniformLocation(this._program, "u_numScanlines"),
      objectBounds: context.getUniformLocation(this._program, "u_objectBounds"),
      opacityFactor: context.getUniformLocation(
        this._program,
        "u_opacityFactor",
      ),
    };
    // texture units never change, so the sampler uniforms are set only once
    context.gl.useProgram(this._program);
    context.gl.uniform1i(
      context.getUniformLocation(this._program, "u_scanlineData"),
      WebGLShapesRenderer._textureUnits.SCANLINE_DATA,
    );
    context.gl.uniform1i(
      context.getUniformLocation(this._program, "u_shapeFillColors"),
      WebGLShapesRenderer._textureUnits.SHAPE_FILL_COLORS,
    );
    context.gl.uniform1i(
      context.getUniformLocation(this._program, "u_shapeStrokeColors"),
      WebGLShapesRenderer._textureUnits.SHAPE_STROKE_COLORS,
    );
    context.gl.useProgram(null);
  }

  /**
   * Synchronizes GPU textures with the current model state
   *
   * Loads all shapes data of the model set by {@link setModel}, removes GPU
   * resources for shapes that are no longer needed, and creates or updates
   * scanline data textures and color textures for the remaining ones.
   *
   * @param tables - Tables that the shapes objects resolve their properties from
   * @param colorMaps - Project-global color maps for {@link GroupByConfig} resolution
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadShapes - Async getter for shapes data
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   */
  async synchronize(
    tables: Table[],
    colorMaps: GroupValueMap<Color>[],
    visibilityMaps: GroupValueMap<boolean>[],
    opacityMaps: GroupValueMap<number>[],
    loadShapes: (
      shapes: Shapes,
      options?: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
    loadTable: (
      table: Table,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    this.recordSyncState();
    const newRefs = await this.loadObjects(tables, loadShapes, loadTable, {
      signal,
    });
    const matches = this.matchOrDestroyRenderedObjects(newRefs);
    await this._createOrUpdateRenderedShapes(
      matches,
      tables,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      loadTable,
      { signal },
    );
  }

  /**
   * Issues the WebGL draw calls for all synchronized shapes
   *
   * Renders each shapes object as a full-screen quad whose fragment shader
   * performs scanline-based polygon rasterization using the per-object
   * scanline data texture, with its world → data matrix, bounds, number of
   * scanlines and opacity factor as uniforms, computed from the current model
   * (see {@link getRenderPasses}). Objects whose layer or object is invisible
   * are skipped.
   */
  draw(): void {
    const renderPasses = this.getRenderPasses();
    if (renderPasses.length === 0) {
      return;
    }
    this.context.gl.useProgram(this._program);
    this.context.gl.uniformMatrix3x2fv(
      this._uniformLocations.viewportToWorldMatrix,
      false,
      WebGLUtils.convertMatrixToGLMat3x2(
        WebGLUtils.createViewportToWorldMatrix(this.viewport),
      ),
    );
    this.context.gl.uniform1f(
      this._uniformLocations.strokeWidth,
      this.renderOptions.strokeWidth,
    );
    this.context.enableAlphaBlending();
    for (const {
      layer,
      object: shapes,
      renderedObject: renderedShapes,
    } of renderPasses) {
      const opacityFactor = WebGLShapesRenderer.computeOpacityFactor(
        layer,
        shapes,
      );
      if (opacityFactor === 0) {
        continue;
      }
      this.context.gl.uniformMatrix3x2fv(
        this._uniformLocations.worldToDataMatrix,
        false,
        WebGLUtils.convertMatrixToGLMat3x2(
          WebGLUtils.createWorldToDataMatrix(shapes.transform, layer.transform),
        ),
      );
      this.context.gl.uniform4f(
        this._uniformLocations.objectBounds,
        renderedShapes.objectBounds.x,
        renderedShapes.objectBounds.y,
        renderedShapes.objectBounds.width,
        renderedShapes.objectBounds.height,
      );
      this.context.gl.uniform1ui(
        this._uniformLocations.numScanlines,
        renderedShapes.numScanlines,
      );
      this.context.gl.uniform1f(
        this._uniformLocations.opacityFactor,
        opacityFactor,
      );
      this.context.gl.activeTexture(
        WebGL2RenderingContext.TEXTURE0 +
          WebGLShapesRenderer._textureUnits.SCANLINE_DATA,
      );
      this.context.gl.bindTexture(
        WebGL2RenderingContext.TEXTURE_2D,
        renderedShapes.scanlineDataTexture,
      );
      this.context.gl.activeTexture(
        WebGL2RenderingContext.TEXTURE0 +
          WebGLShapesRenderer._textureUnits.SHAPE_FILL_COLORS,
      );
      this.context.gl.bindTexture(
        WebGL2RenderingContext.TEXTURE_2D,
        renderedShapes.shapeFillColorsTexture,
      );
      this.context.gl.activeTexture(
        WebGL2RenderingContext.TEXTURE0 +
          WebGLShapesRenderer._textureUnits.SHAPE_STROKE_COLORS,
      );
      this.context.gl.bindTexture(
        WebGL2RenderingContext.TEXTURE_2D,
        renderedShapes.shapeStrokeColorsTexture,
      );
      this.context.gl.drawArrays(WebGL2RenderingContext.TRIANGLE_STRIP, 0, 4);
    }
    this.context.disableAlphaBlending();
    this.context.gl.useProgram(null);
  }

  /**
   * Releases the shader program and all per-object GPU textures
   */
  destroy(): void {
    this.context.gl.deleteProgram(this._program);
    this.clearRenderedObjects();
  }

  /**
   * Deletes all GPU textures owned by a single rendered object
   */
  protected override destroyRenderedObject(
    renderedShapes: RenderedShapes,
  ): void {
    this.context.gl.deleteTexture(renderedShapes.scanlineDataTexture);
    this.context.gl.deleteTexture(renderedShapes.shapeFillColorsTexture);
    this.context.gl.deleteTexture(renderedShapes.shapeStrokeColorsTexture);
  }

  /**
   * Creates new GPU resources for shapes that have no rendered object yet, or
   * updates existing ones when the model state has changed
   *
   * Runs in two passes. The first prepares every object (see
   * {@link _prepareRenderedShapes}), issuing all requests before the first
   * `await`. The second awaits the preparations in order and uploads them, each
   * in one synchronous block that creates the new textures and releases the
   * ones they replace, so a draw in between never sees a half-updated object
   * or a released texture. New objects join the rendered objects as soon as
   * their textures exist, so an aborted synchronization leaves nothing
   * orphaned.
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
   * of holding every object's resolved color buffers until the second pass has
   * uploaded them.
   *
   * An object whose preparation fails is logged and dropped, like an object
   * whose data fails to load (see {@link loadObjects}); the other objects are
   * unaffected. Objects whose shapes have no area are dropped as well, as the
   * fragment shader discards them anyway.
   *
   * @param matches - The objects to create or update GPU resources for, in draw
   * order, each with the rendered shapes to reuse for it, if any
   * @param tables - Tables that the objects resolve their properties from
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   */
  private async _createOrUpdateRenderedShapes(
    matches: {
      newRef: ShapesRef;
      renderedObject: RenderedShapes | undefined;
    }[],
    tables: Table[],
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
      ({ newRef, renderedObject: renderedShapes }) => {
        const preparedPromise = this._prepareRenderedShapes(
          newRef,
          renderedShapes,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          WebGLShapesRenderer.createObjectTableLoader(
            newRef,
            tables,
            loadTable,
          ),
          { signal },
        );
        preparedPromise.catch(() => {}); // prevent unhandled rejections in console
        return { newRef, renderedShapes, preparedPromise };
      },
    );
    for (const { newRef, renderedShapes, preparedPromise } of preloads) {
      let prepared;
      try {
        prepared = await preparedPromise;
      } catch (error) {
        signal?.throwIfAborted();
        console.error(
          `Failed to prepare shapes object with ID '${newRef.object.id}'`,
          error,
        );
        if (renderedShapes !== undefined) {
          this.removeRenderedObject(renderedShapes);
        }
        continue;
      }
      signal?.throwIfAborted();
      if (prepared === null) {
        console.warn(
          `Shapes object with ID '${newRef.object.id}' has no area, skipping`,
        );
        if (renderedShapes !== undefined) {
          this.removeRenderedObject(renderedShapes);
        }
        continue;
      }
      // no awaits from here on, so that the object is updated atomically
      const renderConfigSnapshot = {
        shapeFillColor: newRef.object.shapeFillColor,
        shapeFillVisibility: newRef.object.shapeFillVisibility,
        shapeFillOpacity: newRef.object.shapeFillOpacity,
        shapeStrokeColor: newRef.object.shapeStrokeColor,
        shapeStrokeVisibility: newRef.object.shapeStrokeVisibility,
        shapeStrokeOpacity: newRef.object.shapeStrokeOpacity,
      };
      const scanlineDataTexture =
        prepared.scanlineBuffer !== undefined
          ? this._createScanlineDataTexture(prepared.scanlineBuffer)
          : undefined;
      const shapeFillColorsTexture =
        prepared.packedShapeFillColors !== undefined
          ? this._createShapeColorsTexture(prepared.packedShapeFillColors)
          : undefined;
      const shapeStrokeColorsTexture =
        prepared.packedShapeStrokeColors !== undefined
          ? this._createShapeColorsTexture(prepared.packedShapeStrokeColors)
          : undefined;
      if (renderedShapes === undefined) {
        if (
          scanlineDataTexture === undefined ||
          shapeFillColorsTexture === undefined ||
          shapeStrokeColorsTexture === undefined
        ) {
          throw new Error("All textures must be created for new shapes object");
        }
        this.addRenderedObject({
          ref: newRef,
          renderConfigSnapshot,
          objectBounds: prepared.objectBounds,
          numScanlines: prepared.numScanlines,
          scanlineDataTexture,
          shapeFillColorsTexture,
          shapeStrokeColorsTexture,
        });
      } else {
        renderedShapes.renderConfigSnapshot = renderConfigSnapshot;
        if (scanlineDataTexture !== undefined) {
          this.context.gl.deleteTexture(renderedShapes.scanlineDataTexture);
          renderedShapes.scanlineDataTexture = scanlineDataTexture;
          renderedShapes.objectBounds = prepared.objectBounds;
          renderedShapes.numScanlines = prepared.numScanlines;
        }
        if (shapeFillColorsTexture !== undefined) {
          this.context.gl.deleteTexture(renderedShapes.shapeFillColorsTexture);
          renderedShapes.shapeFillColorsTexture = shapeFillColorsTexture;
        }
        if (shapeStrokeColorsTexture !== undefined) {
          this.context.gl.deleteTexture(
            renderedShapes.shapeStrokeColorsTexture,
          );
          renderedShapes.shapeStrokeColorsTexture = shapeStrokeColorsTexture;
        }
      }
    }
  }

  /**
   * Prepares everything that has to be uploaded for an object
   *
   * Decides what the object's textures need - the geometry for a new object or
   * a changed number of scanlines, and the resolved fill and stroke colors whose
   * configurations changed - requests all of it before the first `await`, and
   * then computes the bounds, rasterizes the scanline data and folds the
   * resolved visibilities and opacities into the colors.
   *
   * Must be called synchronously for every object of a synchronization, see
   * {@link _createOrUpdateRenderedShapes}.
   *
   * @param newRef - The object to prepare
   * @param renderedShapes - The object's current GPU state, if it is reused
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadTable - Loader for the object's table, if any
   * @param options - Optional abort signal
   * @returns The bounds and the number of scanlines, the packed scanline data
   * (if the geometry was loaded) and the resolved colors that have to be
   * uploaded, or `null` if the shapes have no area
   */
  private async _prepareRenderedShapes(
    newRef: ShapesRef,
    renderedShapes: RenderedShapes | undefined,
    colorMaps: GroupValueMap<Color>[],
    visibilityMaps: GroupValueMap<boolean>[],
    opacityMaps: GroupValueMap<number>[],
    loadTable:
      ((options?: { signal?: AbortSignal }) => Promise<TableData>) | undefined,
    options?: { signal?: AbortSignal },
  ): Promise<{
    objectBounds: Rect;
    numScanlines: number;
    scanlineBuffer: Float32Array | undefined;
    packedShapeFillColors: Uint32Array | undefined;
    packedShapeStrokeColors: Uint32Array | undefined;
  } | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { numScanlines } = this.renderOptions;
    const geometryChanged =
      renderedShapes === undefined ||
      renderedShapes.numScanlines !== numScanlines;
    const fillColorsChanged =
      WebGLShapesRenderer._checkShapeFillColorsTextureChanged(
        renderedShapes,
        newRef,
      );
    const strokeColorsChanged =
      WebGLShapesRenderer._checkShapeStrokeColorsTextureChanged(
        renderedShapes,
        newRef,
      );
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // values per texture line, 1 per R32UI texel
    const geometryPromise = geometryChanged
      ? newRef.data.loadGeometry({ signal })
      : undefined;
    const packedShapeFillColorsPromise = fillColorsChanged
      ? ColorResolver.resolveColors(
          newRef.itemIds,
          newRef.object.shapeFillColor,
          colorMaps,
          defaultShapeFillColor,
          { signal, loadTable, align: numValuesPerTextureLine },
        )
      : undefined;
    const packedShapeFillVisibilitiesPromise = fillColorsChanged
      ? VisibilityResolver.resolveVisibilities(
          newRef.itemIds,
          newRef.object.shapeFillVisibility,
          visibilityMaps,
          defaultShapeFillVisibility,
          { signal, loadTable, align: numValuesPerTextureLine },
        )
      : undefined;
    const packedShapeFillOpacitiesPromise = fillColorsChanged
      ? OpacityResolver.resolveOpacities(
          newRef.itemIds,
          newRef.object.shapeFillOpacity,
          opacityMaps,
          defaultShapeFillOpacity,
          { signal, loadTable, align: numValuesPerTextureLine },
        )
      : undefined;
    const packedShapeStrokeColorsPromise = strokeColorsChanged
      ? ColorResolver.resolveColors(
          newRef.itemIds,
          newRef.object.shapeStrokeColor,
          colorMaps,
          defaultShapeStrokeColor,
          { signal, loadTable, align: numValuesPerTextureLine },
        )
      : undefined;
    const packedShapeStrokeVisibilitiesPromise = strokeColorsChanged
      ? VisibilityResolver.resolveVisibilities(
          newRef.itemIds,
          newRef.object.shapeStrokeVisibility,
          visibilityMaps,
          defaultShapeStrokeVisibility,
          { signal, loadTable, align: numValuesPerTextureLine },
        )
      : undefined;
    const packedShapeStrokeOpacitiesPromise = strokeColorsChanged
      ? OpacityResolver.resolveOpacities(
          newRef.itemIds,
          newRef.object.shapeStrokeOpacity,
          opacityMaps,
          defaultShapeStrokeOpacity,
          { signal, loadTable, align: numValuesPerTextureLine },
        )
      : undefined;
    const [
      geometry,
      packedShapeFillColors,
      packedShapeFillVisibilities,
      packedShapeFillOpacities,
      packedShapeStrokeColors,
      packedShapeStrokeVisibilities,
      packedShapeStrokeOpacities,
    ] = await Promise.all([
      geometryPromise,
      packedShapeFillColorsPromise,
      packedShapeFillVisibilitiesPromise,
      packedShapeFillOpacitiesPromise,
      packedShapeStrokeColorsPromise,
      packedShapeStrokeVisibilitiesPromise,
      packedShapeStrokeOpacitiesPromise,
    ]);
    signal?.throwIfAborted();
    let objectBounds: Rect;
    let scanlineBuffer: Float32Array | undefined;
    if (geometry !== undefined) {
      const newObjectBounds = await WebGLShapesRenderer._getObjectBounds(
        geometry,
        newRef.itemsMask,
        { signal },
      );
      if (newObjectBounds === null) {
        return null;
      }
      objectBounds = newObjectBounds;
      scanlineBuffer = await WebGLShapesRenderer._createScanlineBuffer(
        numScanlines,
        geometry,
        newRef.itemsMask,
        objectBounds,
        { signal },
      );
    } else if (renderedShapes !== undefined) {
      objectBounds = renderedShapes.objectBounds;
    } else {
      throw new Error("Geometry must be loaded for new shapes object");
    }
    if (
      packedShapeFillColors !== undefined &&
      packedShapeFillVisibilities !== undefined &&
      packedShapeFillOpacities !== undefined
    ) {
      await AsyncUtils.forEach(
        packedShapeFillColors,
        (packedShapeFillColor, i) => {
          packedShapeFillColors[i] = ColorUtils.withAlpha(
            packedShapeFillColor,
            packedShapeFillVisibilities[i]!,
            packedShapeFillOpacities[i]!,
          );
        },
        { signal },
      );
    }
    if (
      packedShapeStrokeColors !== undefined &&
      packedShapeStrokeVisibilities !== undefined &&
      packedShapeStrokeOpacities !== undefined
    ) {
      await AsyncUtils.forEach(
        packedShapeStrokeColors,
        (packedShapeStrokeColor, i) => {
          packedShapeStrokeColors[i] = ColorUtils.withAlpha(
            packedShapeStrokeColor,
            packedShapeStrokeVisibilities[i]!,
            packedShapeStrokeOpacities[i]!,
          );
        },
        { signal },
      );
    }
    return {
      objectBounds,
      numScanlines,
      scanlineBuffer,
      packedShapeFillColors,
      packedShapeStrokeColors,
    };
  }

  /**
   * Builds the scanline data of a shapes object
   *
   * Rasterizes all shapes into horizontal scanlines and packs the result into
   * a float buffer, aligned to the lines of the scanline data texture that
   * {@link _createScanlineDataTexture} creates from it.
   *
   * @param numScanlines - Number of scanlines to rasterize into
   * @param geometry - Geometry for all shapes in the object
   * @param shapesMask - Per-shape inclusion mask, or `undefined` if all shapes are included
   * @param objectBounds - Axis-aligned bounding box of all shapes
   * @param options - Optional abort signal
   * @returns The packed scanline data
   */
  private static async _createScanlineBuffer(
    numScanlines: number,
    geometry: ShapesGeometry,
    shapesMask: Uint8Array | undefined,
    objectBounds: Rect,
    options?: { signal?: AbortSignal },
  ): Promise<Float32Array> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        numScanlines,
        geometry,
        shapesMask,
        objectBounds,
        { signal },
      );
    const numValuesPerTextureLine =
      4 * WebGLShapesRenderer._scanlineDataTextureWidth; // 4 values per RGBA32F texel
    const scanlineBuffer = await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
      { align: numValuesPerTextureLine, signal },
    );
    return new Float32Array(scanlineBuffer);
  }

  /**
   * Uploads packed scanline data as an RGBA32F texture
   *
   * @param scanlineBuffer - The packed scanline data, see {@link _createScanlineBuffer}
   * @returns The scanline data texture
   */
  private _createScanlineDataTexture(
    scanlineBuffer: Float32Array,
  ): WebGLTexture {
    const numValuesPerTextureLine =
      4 * WebGLShapesRenderer._scanlineDataTextureWidth; // 4 values per RGBA32F texel
    return this.context.createDataTexture(
      WebGL2RenderingContext.RGBA32F,
      WebGLShapesRenderer._scanlineDataTextureWidth,
      scanlineBuffer.length / numValuesPerTextureLine,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT,
      scanlineBuffer,
    );
  }

  /**
   * Uploads packed fill or stroke colors as an R32UI texture
   *
   * @param packedShapeColors - The packed RGBA colors, one per shape, aligned
   * to the texture width
   * @returns The colors texture
   */
  private _createShapeColorsTexture(
    packedShapeColors: Uint32Array,
  ): WebGLTexture {
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // values per texture line, 1 per R32UI texel
    return this.context.createDataTexture(
      WebGL2RenderingContext.R32UI,
      WebGLShapesRenderer._shapeColorsTextureWidth,
      packedShapeColors.length / numValuesPerTextureLine,
      WebGL2RenderingContext.RED_INTEGER,
      WebGL2RenderingContext.UNSIGNED_INT,
      packedShapeColors,
    );
  }

  /**
   * Computes the axis-aligned bounding box of all (included) shapes
   *
   * @param geometry - Geometry for all shapes in the object
   * @param shapesMask - Per-shape inclusion mask, or `undefined` if all shapes are included
   * @param options - Optional abort signal
   * @returns The bounding rectangle in data-space coordinates, or `null` if the
   * shapes have no area, as such an object can neither be rasterized into
   * scanlines nor drawn by the fragment shader
   * @throws Error if the geometry is empty
   */
  private static async _getObjectBounds(
    geometry: ShapesGeometry,
    shapesMask: Uint8Array | undefined,
    options?: { signal?: AbortSignal },
  ): Promise<Rect | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const {
      shapePolygonOffsets,
      polygonRingOffsets,
      ringVertexOffsets,
      coords,
    } = geometry;
    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity;
    const maybeYield = AsyncUtils.createYielder();
    for (let s = 0; s < shapePolygonOffsets.length - 1; s++) {
      if (shapesMask === undefined || shapesMask[s]! > 0) {
        const polygonStart = shapePolygonOffsets[s]!;
        const polygonEnd = shapePolygonOffsets[s + 1]!;
        for (let p = polygonStart; p < polygonEnd; p++) {
          const shellRing = polygonRingOffsets[p]!;
          const shellVertexStart = ringVertexOffsets[shellRing]!;
          const shellVertexEnd = ringVertexOffsets[shellRing + 1]!;
          for (let v = shellVertexStart; v < shellVertexEnd; v++) {
            const x = coords[2 * v]!;
            const y = coords[2 * v + 1]!;
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
        }
      }
      await maybeYield({ signal });
    }
    if (
      !Number.isFinite(xMin) ||
      !Number.isFinite(yMin) ||
      !Number.isFinite(xMax) ||
      !Number.isFinite(yMax)
    ) {
      throw new Error("Shapes geometry must not be empty");
    }
    if (xMin >= xMax || yMin >= yMax) {
      return null;
    }
    return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
  }

  /**
   * Returns whether the fill colors of an object have to be resolved again
   *
   * Colors carry the resolved shape visibilities and opacities in their alpha
   * channel, so they also depend on those configurations. The layer- and
   * object-level visibility and opacity are shader uniforms (see
   * {@link WebGLRendererBase.computeOpacityFactor}) and do not matter here.
   * Also true for an object that has not been rendered yet, like the other
   * predicates.
   *
   * @todo Changes to the color, visibility and opacity maps themselves are not
   * detected; they are only re-read when a configuration referencing them
   * changes.
   */
  private static _checkShapeFillColorsTextureChanged(
    renderedShapes: RenderedShapes | undefined,
    newRef: ShapesRef,
  ): boolean {
    return (
      renderedShapes === undefined ||
      !deepEqual(
        renderedShapes.renderConfigSnapshot.shapeFillVisibility,
        newRef.object.shapeFillVisibility,
      ) ||
      !deepEqual(
        renderedShapes.renderConfigSnapshot.shapeFillOpacity,
        newRef.object.shapeFillOpacity,
      ) ||
      !deepEqual(
        renderedShapes.renderConfigSnapshot.shapeFillColor,
        newRef.object.shapeFillColor,
      )
    );
  }

  /**
   * Returns whether the stroke colors of an object have to be resolved again
   *
   * See {@link _checkShapeFillColorsTextureChanged}.
   *
   * @todo Changes to the color, visibility and opacity maps themselves are not
   * detected; they are only re-read when a configuration referencing them
   * changes.
   */
  private static _checkShapeStrokeColorsTextureChanged(
    renderedShapes: RenderedShapes | undefined,
    newRef: ShapesRef,
  ): boolean {
    return (
      renderedShapes === undefined ||
      !deepEqual(
        renderedShapes.renderConfigSnapshot.shapeStrokeVisibility,
        newRef.object.shapeStrokeVisibility,
      ) ||
      !deepEqual(
        renderedShapes.renderConfigSnapshot.shapeStrokeOpacity,
        newRef.object.shapeStrokeOpacity,
      ) ||
      !deepEqual(
        renderedShapes.renderConfigSnapshot.shapeStrokeColor,
        newRef.object.shapeStrokeColor,
      )
    );
  }
}

/**
 * A reference to a shapes object, its layer, and its loaded data
 */
type ShapesRef = ObjectRef<Shapes, ShapesData>;

/**
 * GPU state for a single shapes object
 *
 * Holds the texture handles for scanline data, fill colors and stroke colors,
 * plus a snapshot of the model values they were built from, which the change
 * predicates compare against: every property they read has to be captured in
 * it. Layer- and object-level properties are read from the current model when
 * drawing (see {@link WebGLRendererBase.getRenderPasses}), and are not part of
 * the snapshot. The number of scanlines is the one the scanline data texture
 * was rasterized for, which is also the one the object is drawn with.
 */
type RenderedShapes = RenderedObjectBase<Shapes, ShapesData> & {
  numScanlines: number;
  scanlineDataTexture: WebGLTexture;
  shapeFillColorsTexture: WebGLTexture;
  shapeStrokeColorsTexture: WebGLTexture;
  renderConfigSnapshot: Pick<
    Shapes,
    | "shapeFillColor"
    | "shapeFillVisibility"
    | "shapeFillOpacity"
    | "shapeStrokeColor"
    | "shapeStrokeVisibility"
    | "shapeStrokeOpacity"
  >;
};
