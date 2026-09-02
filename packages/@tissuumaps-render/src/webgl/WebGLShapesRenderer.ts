import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  type Color,
  type ColorConfig,
  type DefaultMap,
  type Layer,
  MathUtils,
  type OpacityConfig,
  type Rect,
  type Shapes,
  type ShapesData,
  type ShapesGeometry,
  type Table,
  type TableData,
  type VisibilityConfig,
  type WebGLShapesRenderOptions,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
} from "@tissuumaps/core";

import shapesFragmentShader from "../assets/shaders/shapes.frag?raw";
import shapesVertexShader from "../assets/shaders/shapes.vert?raw";
import type { WebGLContext } from "./WebGLContext";
import {
  type ObjectRef,
  type RenderedObjectBase,
  WebGLRendererBase,
} from "./WebGLRendererBase";
import { WebGLShapesRasterizer } from "./WebGLShapesRasterizer";
import { WebGLUtils } from "./WebGLUtils";
import { ColorResolver } from "./resolvers/ColorResolver";
import { OpacityResolver } from "./resolvers/OpacityResolver";
import { VisibilityResolver } from "./resolvers/VisibilityResolver";

/**
 * WebGL renderer for two-dimensional shape clouds
 *
 * Shapes are rasterized on the GPU via a scanline-based algorithm. Each shapes
 * object is represented by a full-screen quad whose fragment shader samples a
 * scanline data texture to determine polygon membership, fill colors, and
 * stroke colors.
 *
 * Every object owns its textures. Synchronizing compares the current model
 * state against the state those textures were built from, and rebuilds only the
 * ones whose inputs changed.
 */
export class WebGLShapesRenderer extends WebGLRendererBase<
  Shapes,
  ShapesData,
  RenderedShapes
> {
  private static readonly _scanlineDataTextureWidth = 4096; // see fragment shader
  private static readonly _shapeColorsTextureWidth = 4096; // see fragment shader

  private readonly _program: WebGLProgram;
  private readonly _uniformLocations: {
    viewportToWorldMatrix: WebGLUniformLocation;
    worldToDataMatrix: WebGLUniformLocation;
    strokeWidth: WebGLUniformLocation;
    numScanlines: WebGLUniformLocation;
    objectBounds: WebGLUniformLocation;
    scanlineData: WebGLUniformLocation;
    shapeFillColors: WebGLUniformLocation;
    shapeStrokeColors: WebGLUniformLocation;
  };
  private _strokeWidth: number;
  private _numScanlines: number;

  /**
   * Creates the shader program and retrieves uniform locations
   *
   * @param context - The WebGL context to use for rendering
   * @param options - Optional viewport and render options
   */
  constructor(
    context: WebGLContext,
    options?: { viewport?: Rect; renderOptions?: WebGLShapesRenderOptions },
  ) {
    super(context, options);
    const { renderOptions } = options ?? {};
    const { strokeWidth, numScanlines } = renderOptions ?? {};
    this._strokeWidth = strokeWidth ?? 1.0;
    this._numScanlines = numScanlines ?? 512;
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
      scanlineData: context.getUniformLocation(this._program, "u_scanlineData"),
      shapeFillColors: context.getUniformLocation(
        this._program,
        "u_shapeFillColors",
      ),
      shapeStrokeColors: context.getUniformLocation(
        this._program,
        "u_shapeStrokeColors",
      ),
    };
  }

  /**
   * Sets the render options, and reports what they require to take effect
   *
   * The stroke width is a shader uniform, so changing it only requires a
   * redraw. The number of scanlines is not: the scanline data textures are
   * rasterized for a fixed number of scanlines, so they are discarded here and
   * rebuilt by the requested resynchronization.
   *
   * @param options - The options to set for the renderer
   * @returns Whether the renderer has to be resynchronized and/or redrawn
   */
  setRenderOptions(options: WebGLShapesRenderOptions): {
    resync: boolean;
    redraw: boolean;
  } {
    const { strokeWidth, numScanlines } = options;
    let resync = false;
    let redraw = false;
    if (strokeWidth !== this._strokeWidth) {
      this._strokeWidth = strokeWidth;
      redraw = true;
    }
    if (numScanlines !== this._numScanlines) {
      // invalidate scanline data textures
      for (const renderedShapes of this.renderedObjects) {
        if (renderedShapes.scanlineDataTexture !== undefined) {
          this.context.gl.deleteTexture(renderedShapes.scanlineDataTexture);
        }
        renderedShapes.scanlineDataTexture = undefined;
      }
      this._numScanlines = numScanlines;
      resync = true;
    }
    return { resync, redraw };
  }

  /**
   * Synchronizes GPU textures with the current model state
   *
   * Loads all shapes data for the given layers, removes GPU resources for
   * shapes that are no longer needed, and creates or updates scanline data
   * textures and color textures for the remaining ones.
   *
   * @param layers - Layers to render
   * @param shapes - Shapes data objects
   * @param tables - Tables that the shapes objects resolve their properties from
   * @param colorMaps - Project-global color maps for {@link GroupByConfig} resolution
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadShapes - Async getter for shapes data
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   * @returns The bounding box of all rendered shapes in world coordinates, or
   * `null` if nothing is rendered
   */
  async synchronize(
    layers: Layer[],
    shapes: Shapes[],
    tables: Table[],
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadShapes: (
      shapes: Shapes,
      options?: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
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
      shapes,
      tables,
      loadShapes,
      loadTable,
      { signal },
    );
    const renderedShapesByNewRef = this._cleanRenderedShapes(newRefs);
    this.renderedObjects = await this._createOrUpdateRenderedShapes(
      newRefs,
      renderedShapesByNewRef,
      tables,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      loadTable,
      { signal },
    );
    return this.getRenderedBounds();
  }

  /**
   * Issues the WebGL draw calls for all synchronized shapes
   *
   * Renders each shapes object as a full-screen quad whose fragment shader
   * performs scanline-based polygon rasterization using the per-object
   * scanline data texture.
   *
   * @throws Error if the renderer has not been initialized
   */
  draw(): void {
    if (this.viewport === undefined) {
      throw new Error("Not initialized");
    }
    if (this.renderedObjects.length === 0) {
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
    this.context.gl.uniform1ui(
      this._uniformLocations.numScanlines,
      this._numScanlines,
    );
    this.context.gl.uniform1f(
      this._uniformLocations.strokeWidth,
      this._strokeWidth,
    );
    this.context.gl.uniform1i(this._uniformLocations.scanlineData, 1);
    this.context.gl.uniform1i(this._uniformLocations.shapeFillColors, 2);
    this.context.gl.uniform1i(this._uniformLocations.shapeStrokeColors, 3);
    this.context.enableAlphaBlending();
    for (const renderedShapes of this.renderedObjects) {
      if (renderedShapes.scanlineDataTexture === undefined) {
        continue; // scanline data texture is currently being regenerated
      }
      const worldToDataMatrix = WebGLUtils.createWorldToDataMatrix(
        renderedShapes.ref.object.transform,
        renderedShapes.ref.layer.transform,
      );
      this.context.gl.uniformMatrix3x2fv(
        this._uniformLocations.worldToDataMatrix,
        false,
        WebGLUtils.convertMatrixToGLMat3x2(worldToDataMatrix),
      );
      this.context.gl.uniform4f(
        this._uniformLocations.objectBounds,
        renderedShapes.objectBounds.x,
        renderedShapes.objectBounds.y,
        renderedShapes.objectBounds.width,
        renderedShapes.objectBounds.height,
      );
      this.context.gl.activeTexture(WebGL2RenderingContext.TEXTURE1);
      this.context.gl.bindTexture(
        WebGL2RenderingContext.TEXTURE_2D,
        renderedShapes.scanlineDataTexture,
      );
      this.context.gl.activeTexture(WebGL2RenderingContext.TEXTURE2);
      this.context.gl.bindTexture(
        WebGL2RenderingContext.TEXTURE_2D,
        renderedShapes.shapeFillColorsTexture,
      );
      this.context.gl.activeTexture(WebGL2RenderingContext.TEXTURE3);
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
    for (const renderedShapes of this.renderedObjects) {
      this._destroyRenderedShapes(renderedShapes);
    }
    this.renderedObjects = [];
  }

  /**
   * Removes the GPU resources of shapes objects that are no longer referenced
   *
   * Matches the rendered objects to the new set of references, by layer,
   * object, contributed items and data source. Those that still match are
   * returned for reuse; the rest have their textures destroyed.
   *
   * @param newRefs - The object references to match against
   * @returns The reusable rendered objects, by object reference
   */
  private _cleanRenderedShapes(
    newRefs: ShapesRef[],
  ): Map<ShapesRef, RenderedShapes> {
    const renderedShapesByNewRef = new Map<ShapesRef, RenderedShapes>();
    for (let i = 0; i < this.renderedObjects.length; i++) {
      const renderedShapes = this.renderedObjects[i]!;
      const newRef = newRefs.find(
        (newRef) =>
          renderedShapes.ref.layer.id === newRef.layer.id &&
          renderedShapes.ref.object.id === newRef.object.id &&
          renderedShapes.ref.itemIds === newRef.itemIds &&
          renderedShapes.ref.itemsMask === newRef.itemsMask &&
          // check data source configuration instead of data
          deepEqual(
            renderedShapes.state.shapes.dataSource,
            newRef.object.dataSource,
          ),
      );
      if (newRef !== undefined) {
        renderedShapesByNewRef.set(newRef, renderedShapes);
      } else {
        const [renderedShapes] = this.renderedObjects.splice(i, 1);
        this._destroyRenderedShapes(renderedShapes!);
        i--;
      }
    }
    return renderedShapesByNewRef;
  }

  /**
   * Creates new GPU resources for shapes that have no existing render pass,
   * or updates existing ones when the model state has changed
   *
   * Objects whose shapes have no area are skipped, as the fragment shader
   * discards them anyway, and any GPU resources they still hold are released.
   *
   * Scanline data textures are regenerated when the geometry or scanline count
   * changes. Color textures are regenerated when color, visibility, or opacity
   * configurations change. Whatever has to be regenerated is resolved
   * concurrently, and the textures it replaces are released only once it
   * exists, as the object keeps being drawn from them until then.
   *
   * Runs in two passes. The first decides for every object what has to be
   * regenerated and requests all of it - the geometry, and the resolved fill
   * and stroke color buffers - while the second awaits those requests in order,
   * rasterizes the scanline data, and uploads the textures.
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
   * @param newRefs - The objects to create or update GPU resources for
   * @param renderedShapesByNewRef - The reusable GPU resources, by object
   * @param tables - Tables that the objects resolve their properties from
   * @param colorMaps - Project-global color maps
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   * @returns The new ordered list of rendered objects
   */
  private async _createOrUpdateRenderedShapes(
    newRefs: ShapesRef[],
    renderedShapesByNewRef: Map<ShapesRef, RenderedShapes>,
    tables: Table[],
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadTable: (
      table: Table,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<RenderedShapes[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const objectPreloads: {
      newRef: ShapesRef;
      renderedShapes: RenderedShapes | undefined;
      geometryPromise: Promise<ShapesGeometry> | undefined;
      shapeFillColorsPromise: Promise<Uint32Array> | undefined;
      shapeFillVisibilitiesPromise: Promise<Uint8Array> | undefined;
      shapeFillOpacitiesPromise: Promise<Uint8Array> | undefined;
      shapeStrokeColorsPromise: Promise<Uint32Array> | undefined;
      shapeStrokeVisibilitiesPromise: Promise<Uint8Array> | undefined;
      shapeStrokeOpacitiesPromise: Promise<Uint8Array> | undefined;
    }[] = [];
    for (const newRef of newRefs) {
      const renderedShapes = renderedShapesByNewRef.get(newRef);
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
        renderedShapes === undefined ||
        renderedShapes.scanlineDataTexture === undefined
          ? newRef.data.loadGeometry({ signal })
          : undefined;
      geometryPromise?.catch(() => {}); // prevent unhandled rejections in console
      const shapeFillColorsPromise =
        WebGLShapesRenderer._checkShapeFillColorsChanged(renderedShapes, newRef)
          ? this._resolveShapeColors(
              newRef,
              newRef.object.shapeFillColor,
              defaultShapeFillColor,
              colorMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      shapeFillColorsPromise?.catch(() => {}); // prevent unhandled rejections in console
      const shapeFillVisibilitiesPromise =
        WebGLShapesRenderer._checkShapeFillColorsChanged(renderedShapes, newRef)
          ? this._resolveShapeVisibilities(
              newRef,
              newRef.object.shapeFillVisibility,
              defaultShapeFillVisibility,
              visibilityMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      shapeFillVisibilitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const shapeFillOpacitiesPromise =
        WebGLShapesRenderer._checkShapeFillColorsChanged(renderedShapes, newRef)
          ? this._resolveShapeOpacities(
              newRef,
              newRef.object.shapeFillOpacity,
              defaultShapeFillOpacity,
              opacityMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      shapeFillOpacitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const shapeStrokeColorsPromise =
        WebGLShapesRenderer._checkShapeStrokeColorsChanged(
          renderedShapes,
          newRef,
        )
          ? this._resolveShapeColors(
              newRef,
              newRef.object.shapeStrokeColor,
              defaultShapeStrokeColor,
              colorMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      shapeStrokeColorsPromise?.catch(() => {}); // prevent unhandled rejections in console
      const shapeStrokeVisibilitiesPromise =
        WebGLShapesRenderer._checkShapeStrokeColorsChanged(
          renderedShapes,
          newRef,
        )
          ? this._resolveShapeVisibilities(
              newRef,
              newRef.object.shapeStrokeVisibility,
              defaultShapeStrokeVisibility,
              visibilityMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      shapeStrokeVisibilitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const shapeStrokeOpacitiesPromise =
        WebGLShapesRenderer._checkShapeStrokeColorsChanged(
          renderedShapes,
          newRef,
        )
          ? this._resolveShapeOpacities(
              newRef,
              newRef.object.shapeStrokeOpacity,
              defaultShapeStrokeOpacity,
              opacityMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      shapeStrokeOpacitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      objectPreloads.push({
        newRef,
        renderedShapes,
        geometryPromise,
        shapeFillColorsPromise,
        shapeFillVisibilitiesPromise,
        shapeFillOpacitiesPromise,
        shapeStrokeColorsPromise,
        shapeStrokeVisibilitiesPromise,
        shapeStrokeOpacitiesPromise,
      });
    }
    const newRenderedShapes: RenderedShapes[] = [];
    for (const {
      newRef,
      renderedShapes,
      geometryPromise,
      shapeFillColorsPromise,
      shapeFillVisibilitiesPromise,
      shapeFillOpacitiesPromise,
      shapeStrokeColorsPromise,
      shapeStrokeVisibilitiesPromise,
      shapeStrokeOpacitiesPromise,
    } of objectPreloads) {
      const [
        geometry,
        shapeFillColors,
        shapeFillVisibilities,
        shapeFillOpacities,
        shapeStrokeColors,
        shapeStrokeVisibilities,
        shapeStrokeOpacities,
      ] = await Promise.all([
        geometryPromise,
        shapeFillColorsPromise,
        shapeFillVisibilitiesPromise,
        shapeFillOpacitiesPromise,
        shapeStrokeColorsPromise,
        shapeStrokeVisibilitiesPromise,
        shapeStrokeOpacitiesPromise,
      ]);
      signal?.throwIfAborted();
      let objectBounds: Rect;
      let scanlineDataTexture: WebGLTexture | undefined;
      if (geometry !== undefined) {
        const newObjectBounds = await WebGLShapesRenderer._getObjectBounds(
          geometry,
          newRef.itemsMask,
          { signal },
        );
        if (newObjectBounds === null) {
          console.warn(
            `Shapes object with ID '${newRef.object.id}' has no area, skipping`,
          );
          if (renderedShapes !== undefined) {
            this._destroyRenderedShapes(renderedShapes);
          }
          continue;
        }
        objectBounds = newObjectBounds;
        scanlineDataTexture = await this._createScanlineDataTexture(
          geometry,
          newRef.itemsMask,
          objectBounds,
          { signal },
        );
        // delete after awaiting new texture creation
        if (renderedShapes?.scanlineDataTexture !== undefined) {
          this.context.gl.deleteTexture(renderedShapes.scanlineDataTexture);
        }
      } else if (renderedShapes !== undefined) {
        objectBounds = renderedShapes.objectBounds;
        scanlineDataTexture = renderedShapes.scanlineDataTexture;
      } else {
        throw new Error("Geometry must be loaded for new shapes object");
      }
      let shapeFillColorsTexture: WebGLTexture;
      if (
        shapeFillColors !== undefined &&
        shapeFillVisibilities !== undefined &&
        shapeFillOpacities !== undefined
      ) {
        if (renderedShapes !== undefined) {
          this.context.gl.deleteTexture(renderedShapes.shapeFillColorsTexture);
        }
        await WebGLShapesRenderer.packAlpha(
          shapeFillColors,
          shapeFillVisibilities,
          shapeFillOpacities,
          { signal },
        );
        shapeFillColorsTexture = this.context.createDataTexture(
          WebGL2RenderingContext.R32UI,
          WebGLShapesRenderer._shapeColorsTextureWidth,
          shapeFillColors.length / WebGLShapesRenderer._shapeColorsTextureWidth,
          WebGL2RenderingContext.RED_INTEGER,
          WebGL2RenderingContext.UNSIGNED_INT,
          shapeFillColors,
        );
      } else if (renderedShapes !== undefined) {
        shapeFillColorsTexture = renderedShapes.shapeFillColorsTexture;
      } else {
        throw new Error(
          "Shape fill colors must be resolved for new shapes object",
        );
      }
      let shapeStrokeColorsTexture: WebGLTexture;
      if (
        shapeStrokeColors !== undefined &&
        shapeStrokeVisibilities !== undefined &&
        shapeStrokeOpacities !== undefined
      ) {
        if (renderedShapes !== undefined) {
          this.context.gl.deleteTexture(
            renderedShapes.shapeStrokeColorsTexture,
          );
        }
        await WebGLShapesRenderer.packAlpha(
          shapeStrokeColors,
          shapeStrokeVisibilities,
          shapeStrokeOpacities,
          { signal },
        );
        shapeStrokeColorsTexture = this.context.createDataTexture(
          WebGL2RenderingContext.R32UI,
          WebGLShapesRenderer._shapeColorsTextureWidth,
          shapeStrokeColors.length /
            WebGLShapesRenderer._shapeColorsTextureWidth,
          WebGL2RenderingContext.RED_INTEGER,
          WebGL2RenderingContext.UNSIGNED_INT,
          shapeStrokeColors,
        );
      } else if (renderedShapes !== undefined) {
        shapeStrokeColorsTexture = renderedShapes.shapeStrokeColorsTexture;
      } else {
        throw new Error(
          "Shape stroke colors must be resolved for new shapes object",
        );
      }
      newRenderedShapes.push({
        ref: newRef,
        state: {
          layer: {
            visibility: newRef.layer.visibility,
            opacity: newRef.layer.opacity,
            transform: structuredClone(newRef.layer.transform),
          },
          shapes: {
            dataSource: structuredClone(newRef.object.dataSource),
            visibility: newRef.object.visibility,
            opacity: newRef.object.opacity,
            shapeFillColor: structuredClone(newRef.object.shapeFillColor),
            shapeFillVisibility: structuredClone(
              newRef.object.shapeFillVisibility,
            ),
            shapeFillOpacity: structuredClone(newRef.object.shapeFillOpacity),
            shapeStrokeColor: structuredClone(newRef.object.shapeStrokeColor),
            shapeStrokeVisibility: structuredClone(
              newRef.object.shapeStrokeVisibility,
            ),
            shapeStrokeOpacity: structuredClone(
              newRef.object.shapeStrokeOpacity,
            ),
            transform: structuredClone(newRef.object.transform),
          },
        },
        objectBounds,
        scanlineDataTexture,
        shapeFillColorsTexture,
        shapeStrokeColorsTexture,
      });
    }
    return newRenderedShapes;
  }

  /**
   * Deletes all GPU textures owned by a single rendered object
   */
  private _destroyRenderedShapes(renderedShapes: RenderedShapes): void {
    if (renderedShapes.scanlineDataTexture !== undefined) {
      this.context.gl.deleteTexture(renderedShapes.scanlineDataTexture);
    }
    this.context.gl.deleteTexture(renderedShapes.shapeFillColorsTexture);
    this.context.gl.deleteTexture(renderedShapes.shapeStrokeColorsTexture);
  }

  /**
   * Builds the scanline data texture for a shapes object
   *
   * Rasterizes all shapes into horizontal scanlines, packs the
   * result into a float buffer, and uploads it as an RGBA32F texture.
   *
   * @param geometry - Geometry for all shapes in the object
   * @param shapesMask - Per-shape inclusion mask, or `undefined` if all shapes are included
   * @param objectBounds - Axis-aligned bounding box of all shapes
   * @param options - Optional abort signal
   * @returns The scanline data texture
   */
  private async _createScanlineDataTexture(
    geometry: ShapesGeometry,
    shapesMask: Uint8Array | undefined,
    objectBounds: Rect,
    options?: { signal?: AbortSignal },
  ): Promise<WebGLTexture> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        this._numScanlines,
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
    const float32ScanlineBuffer = new Float32Array(scanlineBuffer);
    const scanlineDataTexture = this.context.createDataTexture(
      WebGL2RenderingContext.RGBA32F,
      WebGLShapesRenderer._scanlineDataTextureWidth,
      float32ScanlineBuffer.length / numValuesPerTextureLine,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT,
      float32ScanlineBuffer,
    );
    return scanlineDataTexture;
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
   */
  private static _checkShapeFillColorsChanged(
    renderedShapes: RenderedShapes | undefined,
    newRef: ShapesRef,
  ): boolean {
    return (
      renderedShapes === undefined ||
      renderedShapes.state.layer.visibility !== newRef.layer.visibility ||
      renderedShapes.state.layer.opacity !== newRef.layer.opacity ||
      renderedShapes.state.shapes.visibility !== newRef.object.visibility ||
      renderedShapes.state.shapes.opacity !== newRef.object.opacity ||
      !deepEqual(
        renderedShapes.state.shapes.shapeFillVisibility,
        newRef.object.shapeFillVisibility,
      ) ||
      !deepEqual(
        renderedShapes.state.shapes.shapeFillOpacity,
        newRef.object.shapeFillOpacity,
      ) ||
      !deepEqual(
        renderedShapes.state.shapes.shapeFillColor,
        newRef.object.shapeFillColor,
      )
    );
  }

  /**
   * Returns whether the stroke colors of an object have to be resolved again
   */
  private static _checkShapeStrokeColorsChanged(
    renderedShapes: RenderedShapes | undefined,
    newRef: ShapesRef,
  ): boolean {
    return (
      renderedShapes === undefined ||
      renderedShapes.state.layer.visibility !== newRef.layer.visibility ||
      renderedShapes.state.layer.opacity !== newRef.layer.opacity ||
      renderedShapes.state.shapes.visibility !== newRef.object.visibility ||
      renderedShapes.state.shapes.opacity !== newRef.object.opacity ||
      !deepEqual(
        renderedShapes.state.shapes.shapeStrokeVisibility,
        newRef.object.shapeStrokeVisibility,
      ) ||
      !deepEqual(
        renderedShapes.state.shapes.shapeStrokeOpacity,
        newRef.object.shapeStrokeOpacity,
      ) ||
      !deepEqual(
        renderedShapes.state.shapes.shapeStrokeColor,
        newRef.object.shapeStrokeColor,
      )
    );
  }

  /**
   * Resolves the RGB fill or stroke color of every shape of an object
   *
   * The alpha channel is added later, by
   * {@link WebGLRendererBase.packAlpha}, from the separately resolved
   * visibilities and opacities.
   *
   * @param options - Optional abort signal and table loader
   * @returns The packed colors, one per shape, without alpha
   */
  private _resolveShapeColors(
    ref: ShapesRef,
    shapeColor: ColorConfig,
    defaultShapeColor: Color,
    colorMaps: DefaultMap<Color>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint32Array> {
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // 1 value per R32UI texel
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.object.visibility === false ||
      ref.object.opacity === 0
    ) {
      return Promise.resolve(
        new Uint32Array(
          MathUtils.align(ref.itemIds.length, numValuesPerTextureLine),
        ),
      );
    }
    return ColorResolver.resolveColors(
      ref.itemIds,
      shapeColor,
      colorMaps,
      defaultShapeColor,
      { ...options, align: numValuesPerTextureLine },
    );
  }

  /**
   * Resolves the fill or stroke visibility of every shape of an object
   *
   * @param options - Optional abort signal and table loader
   * @returns The visibilities, one per shape, `0` for invisible
   */
  private _resolveShapeVisibilities(
    ref: ShapesRef,
    shapeVisibility: VisibilityConfig,
    defaultShapeVisibility: boolean,
    visibilityMaps: DefaultMap<boolean>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // 1 value per R32UI texel
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.object.visibility === false ||
      ref.object.opacity === 0
    ) {
      return Promise.resolve(
        new Uint8Array(
          MathUtils.align(ref.itemIds.length, numValuesPerTextureLine),
        ),
      );
    }
    return VisibilityResolver.resolveVisibilities(
      ref.itemIds,
      shapeVisibility,
      visibilityMaps,
      defaultShapeVisibility,
      { ...options, align: numValuesPerTextureLine },
    );
  }

  /**
   * Resolves the fill or stroke alpha of every shape of an object
   *
   * The layer- and object-level opacities are multiplied into the resolved
   * per-shape opacities, as the shader only sees the alpha channel.
   *
   * @param options - Optional abort signal and table loader
   * @returns The alpha values, one per shape
   */
  private _resolveShapeOpacities(
    ref: ShapesRef,
    shapeOpacity: OpacityConfig,
    defaultShapeOpacity: number,
    opacityMaps: DefaultMap<number>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // 1 value per R32UI texel
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.object.visibility === false ||
      ref.object.opacity === 0
    ) {
      return Promise.resolve(
        new Uint8Array(
          MathUtils.align(ref.itemIds.length, numValuesPerTextureLine),
        ),
      );
    }
    const opacityFactor = ref.layer.opacity * ref.object.opacity;
    return OpacityResolver.resolveOpacities(
      ref.itemIds,
      shapeOpacity,
      opacityMaps,
      defaultShapeOpacity,
      { ...options, align: numValuesPerTextureLine, opacityFactor },
    );
  }
}

/**
 * Reference to a shapes object and its associated data
 */
type ShapesRef = ObjectRef<Shapes, ShapesData>;

/**
 * GPU state for a single shapes object
 *
 * Holds the texture handles for scanline data, fill colors and stroke colors,
 * plus a snapshot of the model values they were built from, which the change
 * predicates compare against. A missing scanline data texture marks the
 * scanlines as invalidated, see {@link WebGLShapesRenderer.setRenderOptions}.
 */
type RenderedShapes = RenderedObjectBase<Shapes, ShapesData> & {
  state: {
    layer: Pick<Layer, "visibility" | "opacity" | "transform">;
    shapes: Pick<
      Shapes,
      | "dataSource"
      | "visibility"
      | "opacity"
      | "shapeFillColor"
      | "shapeFillVisibility"
      | "shapeFillOpacity"
      | "shapeStrokeColor"
      | "shapeStrokeVisibility"
      | "shapeStrokeOpacity"
      | "transform"
    >;
  };
  scanlineDataTexture?: WebGLTexture;
  shapeFillColorsTexture: WebGLTexture;
  shapeStrokeColorsTexture: WebGLTexture;
};
