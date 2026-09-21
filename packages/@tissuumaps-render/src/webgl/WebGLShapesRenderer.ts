import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  type Color,
  type ColorConfig,
  ColorUtils,
  type GroupValueMap,
  type Layer,
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
 * state against the state those textures were built from, and rebuilds only the
 * ones whose inputs changed. Layer- and object-level properties (transforms,
 * visibility and opacity) are shader uniforms, so changing them never touches
 * the textures.
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
    opacityFactor: WebGLUniformLocation;
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
   * @param options - Optional render options
   */
  constructor(
    context: WebGLContext,
    options?: { renderOptions?: WebGLShapesRenderOptions },
  ) {
    super(context);
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
      opacityFactor: context.getUniformLocation(
        this._program,
        "u_opacityFactor",
      ),
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
   * rasterized for a fixed number of scanlines, so the requested
   * resynchronization rebuilds them, while every object keeps being drawn with
   * the number of scanlines its texture was built for until then.
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
   * scanline data texture, drawn with the number of scanlines it was built for,
   * and with its opacity factor as a uniform. Objects whose layer or object is
   * invisible are skipped.
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
    this.context.gl.uniform1f(
      this._uniformLocations.strokeWidth,
      this._strokeWidth,
    );
    this.context.gl.uniform1i(this._uniformLocations.scanlineData, 1);
    this.context.gl.uniform1i(this._uniformLocations.shapeFillColors, 2);
    this.context.gl.uniform1i(this._uniformLocations.shapeStrokeColors, 3);
    this.context.enableAlphaBlending();
    for (const renderedShapes of this.renderedObjects) {
      const opacityFactor = WebGLShapesRenderer._computeOpacityFactor(
        renderedShapes.ref,
      );
      if (opacityFactor === 0) {
        continue;
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
      this.context.gl.uniform1ui(
        this._uniformLocations.numScanlines,
        renderedShapes.numScanlines,
      );
      this.context.gl.uniform1f(
        this._uniformLocations.opacityFactor,
        opacityFactor,
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
   * returned for reuse, and adopt the new reference, as the transforms are read
   * from it when drawing; the rest have their textures destroyed. Every
   * reference is matched at most once, so that duplicates are destroyed rather
   * than orphaned.
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
          !renderedShapesByNewRef.has(newRef) &&
          renderedShapes.ref.layer.id === newRef.layer.id &&
          renderedShapes.ref.object.id === newRef.object.id &&
          renderedShapes.ref.itemIds === newRef.itemIds &&
          renderedShapes.ref.itemsMask === newRef.itemsMask &&
          // check data source configuration instead of data
          deepEqual(renderedShapes.state.dataSource, newRef.object.dataSource),
      );
      if (newRef !== undefined) {
        renderedShapes.ref = newRef;
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
   * Scanline data textures are rebuilt when the geometry or the scanline count
   * changes, color textures when a color, visibility or opacity configuration
   * changes. Everything an object needs is resolved first; its textures are
   * then created, and the ones they replace released, in a single synchronous
   * block, so a draw in between never sees a half-updated object or a released
   * texture. New objects join the rendered objects as soon as their textures
   * exist, so an aborted synchronization leaves nothing orphaned.
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
    colorMaps: GroupValueMap<Color>[],
    visibilityMaps: GroupValueMap<boolean>[],
    opacityMaps: GroupValueMap<number>[],
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
      numScanlines: number;
      geometryPromise: Promise<ShapesGeometry> | undefined;
      packedShapeFillColorsPromise: Promise<Uint32Array> | undefined;
      packedShapeFillVisibilitiesPromise: Promise<Uint8Array> | undefined;
      packedShapeFillOpacitiesPromise: Promise<Uint8Array> | undefined;
      packedShapeStrokeColorsPromise: Promise<Uint32Array> | undefined;
      packedShapeStrokeVisibilitiesPromise: Promise<Uint8Array> | undefined;
      packedShapeStrokeOpacitiesPromise: Promise<Uint8Array> | undefined;
    }[] = [];
    for (const newRef of newRefs) {
      const renderedShapes = renderedShapesByNewRef.get(newRef);
      const numScanlines = this._numScanlines;
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
        renderedShapes.numScanlines !== numScanlines
          ? newRef.data.loadGeometry({ signal })
          : undefined;
      geometryPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedShapeFillColorsPromise =
        WebGLShapesRenderer._checkShapeFillColorsTextureChanged(
          renderedShapes,
          newRef,
        )
          ? WebGLShapesRenderer._resolveShapeColors(
              newRef,
              newRef.object.shapeFillColor,
              defaultShapeFillColor,
              colorMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      packedShapeFillColorsPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedShapeFillVisibilitiesPromise =
        WebGLShapesRenderer._checkShapeFillColorsTextureChanged(
          renderedShapes,
          newRef,
        )
          ? WebGLShapesRenderer._resolveShapeVisibilities(
              newRef,
              newRef.object.shapeFillVisibility,
              defaultShapeFillVisibility,
              visibilityMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      packedShapeFillVisibilitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedShapeFillOpacitiesPromise =
        WebGLShapesRenderer._checkShapeFillColorsTextureChanged(
          renderedShapes,
          newRef,
        )
          ? WebGLShapesRenderer._resolveShapeOpacities(
              newRef,
              newRef.object.shapeFillOpacity,
              defaultShapeFillOpacity,
              opacityMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      packedShapeFillOpacitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedShapeStrokeColorsPromise =
        WebGLShapesRenderer._checkShapeStrokeColorsTextureChanged(
          renderedShapes,
          newRef,
        )
          ? WebGLShapesRenderer._resolveShapeColors(
              newRef,
              newRef.object.shapeStrokeColor,
              defaultShapeStrokeColor,
              colorMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      packedShapeStrokeColorsPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedShapeStrokeVisibilitiesPromise =
        WebGLShapesRenderer._checkShapeStrokeColorsTextureChanged(
          renderedShapes,
          newRef,
        )
          ? WebGLShapesRenderer._resolveShapeVisibilities(
              newRef,
              newRef.object.shapeStrokeVisibility,
              defaultShapeStrokeVisibility,
              visibilityMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      packedShapeStrokeVisibilitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      const packedShapeStrokeOpacitiesPromise =
        WebGLShapesRenderer._checkShapeStrokeColorsTextureChanged(
          renderedShapes,
          newRef,
        )
          ? WebGLShapesRenderer._resolveShapeOpacities(
              newRef,
              newRef.object.shapeStrokeOpacity,
              defaultShapeStrokeOpacity,
              opacityMaps,
              { signal, loadTable: loadObjectTable },
            )
          : undefined;
      packedShapeStrokeOpacitiesPromise?.catch(() => {}); // prevent unhandled rejections in console
      objectPreloads.push({
        newRef,
        renderedShapes,
        numScanlines,
        geometryPromise,
        packedShapeFillColorsPromise,
        packedShapeFillVisibilitiesPromise,
        packedShapeFillOpacitiesPromise,
        packedShapeStrokeColorsPromise,
        packedShapeStrokeVisibilitiesPromise,
        packedShapeStrokeOpacitiesPromise,
      });
    }
    const newRenderedShapes: RenderedShapes[] = [];
    for (const {
      newRef,
      renderedShapes,
      numScanlines,
      geometryPromise,
      packedShapeFillColorsPromise,
      packedShapeFillVisibilitiesPromise,
      packedShapeFillOpacitiesPromise,
      packedShapeStrokeColorsPromise,
      packedShapeStrokeVisibilitiesPromise,
      packedShapeStrokeOpacitiesPromise,
    } of objectPreloads) {
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
          console.warn(
            `Shapes object with ID '${newRef.object.id}' has no area, skipping`,
          );
          if (renderedShapes !== undefined) {
            this._destroyRenderedShapes(renderedShapes);
            this.renderedObjects.splice(
              this.renderedObjects.indexOf(renderedShapes),
              1,
            );
          }
          continue;
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
      // no awaits from here on, so that the object is updated atomically
      const state = {
        dataSource: structuredClone(newRef.object.dataSource),
        shapeFillColor: structuredClone(newRef.object.shapeFillColor),
        shapeFillVisibility: structuredClone(newRef.object.shapeFillVisibility),
        shapeFillOpacity: structuredClone(newRef.object.shapeFillOpacity),
        shapeStrokeColor: structuredClone(newRef.object.shapeStrokeColor),
        shapeStrokeVisibility: structuredClone(
          newRef.object.shapeStrokeVisibility,
        ),
        shapeStrokeOpacity: structuredClone(newRef.object.shapeStrokeOpacity),
      };
      const scanlineDataTexture =
        scanlineBuffer !== undefined
          ? this._createScanlineDataTexture(scanlineBuffer)
          : undefined;
      const shapeFillColorsTexture =
        packedShapeFillColors !== undefined
          ? this._createShapeColorsTexture(packedShapeFillColors)
          : undefined;
      const shapeStrokeColorsTexture =
        packedShapeStrokeColors !== undefined
          ? this._createShapeColorsTexture(packedShapeStrokeColors)
          : undefined;
      let currentRenderedShapes: RenderedShapes;
      if (renderedShapes === undefined) {
        if (
          scanlineDataTexture === undefined ||
          shapeFillColorsTexture === undefined ||
          shapeStrokeColorsTexture === undefined
        ) {
          throw new Error("All textures must be created for new shapes object");
        }
        currentRenderedShapes = {
          ref: newRef,
          state,
          objectBounds,
          numScanlines,
          scanlineDataTexture,
          shapeFillColorsTexture,
          shapeStrokeColorsTexture,
        };
        this.renderedObjects.push(currentRenderedShapes);
      } else {
        currentRenderedShapes = renderedShapes;
        currentRenderedShapes.state = state;
        currentRenderedShapes.objectBounds = objectBounds;
        if (scanlineDataTexture !== undefined) {
          this.context.gl.deleteTexture(
            currentRenderedShapes.scanlineDataTexture,
          );
          currentRenderedShapes.scanlineDataTexture = scanlineDataTexture;
          currentRenderedShapes.numScanlines = numScanlines;
        }
        if (shapeFillColorsTexture !== undefined) {
          this.context.gl.deleteTexture(
            currentRenderedShapes.shapeFillColorsTexture,
          );
          currentRenderedShapes.shapeFillColorsTexture = shapeFillColorsTexture;
        }
        if (shapeStrokeColorsTexture !== undefined) {
          this.context.gl.deleteTexture(
            currentRenderedShapes.shapeStrokeColorsTexture,
          );
          currentRenderedShapes.shapeStrokeColorsTexture =
            shapeStrokeColorsTexture;
        }
      }
      newRenderedShapes.push(currentRenderedShapes);
    }
    return newRenderedShapes;
  }

  /**
   * Deletes all GPU textures owned by a single rendered object
   */
  private _destroyRenderedShapes(renderedShapes: RenderedShapes): void {
    this.context.gl.deleteTexture(renderedShapes.scanlineDataTexture);
    this.context.gl.deleteTexture(renderedShapes.shapeFillColorsTexture);
    this.context.gl.deleteTexture(renderedShapes.shapeStrokeColorsTexture);
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
    return this.context.createDataTexture(
      WebGL2RenderingContext.R32UI,
      WebGLShapesRenderer._shapeColorsTextureWidth,
      packedShapeColors.length / WebGLShapesRenderer._shapeColorsTextureWidth,
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
   * Computes the factor that the alpha of every shape of an object is
   * multiplied with
   *
   * @returns The product of the layer and object opacities, or `0` if the
   * layer or the object is invisible
   */
  private static _computeOpacityFactor(ref: ShapesRef): number {
    if (ref.layer.visibility === false || ref.object.visibility === false) {
      return 0;
    }
    return ref.layer.opacity * ref.object.opacity;
  }

  /**
   * Returns whether the fill colors of an object have to be resolved again
   *
   * Colors carry the resolved shape visibilities and opacities in their alpha
   * channel, so they also depend on those configurations. The layer- and
   * object-level visibility and opacity are shader uniforms (see
   * {@link _computeOpacityFactor}) and do not matter here.
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
        renderedShapes.state.shapeFillVisibility,
        newRef.object.shapeFillVisibility,
      ) ||
      !deepEqual(
        renderedShapes.state.shapeFillOpacity,
        newRef.object.shapeFillOpacity,
      ) ||
      !deepEqual(
        renderedShapes.state.shapeFillColor,
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
        renderedShapes.state.shapeStrokeVisibility,
        newRef.object.shapeStrokeVisibility,
      ) ||
      !deepEqual(
        renderedShapes.state.shapeStrokeOpacity,
        newRef.object.shapeStrokeOpacity,
      ) ||
      !deepEqual(
        renderedShapes.state.shapeStrokeColor,
        newRef.object.shapeStrokeColor,
      )
    );
  }

  /**
   * Resolves the RGB fill or stroke color of every shape of an object
   *
   * The alpha channel is added later, by
   * {@link ColorUtils.withAlpha}, from the separately resolved
   * visibilities and opacities.
   *
   * @param options - Optional abort signal and table loader
   * @returns The packed colors, one per shape, without alpha
   */
  private static _resolveShapeColors(
    ref: ShapesRef,
    shapeColor: ColorConfig,
    defaultShapeColor: Color,
    colorMaps: GroupValueMap<Color>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint32Array> {
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // 1 value per R32UI texel
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
  private static _resolveShapeVisibilities(
    ref: ShapesRef,
    shapeVisibility: VisibilityConfig,
    defaultShapeVisibility: boolean,
    visibilityMaps: GroupValueMap<boolean>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // 1 value per R32UI texel
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
   * The layer- and object-level opacities are not multiplied in here, they are
   * a shader uniform (see {@link _computeOpacityFactor}).
   *
   * @param options - Optional abort signal and table loader
   * @returns The alpha values, one per shape
   */
  private static _resolveShapeOpacities(
    ref: ShapesRef,
    shapeOpacity: OpacityConfig,
    defaultShapeOpacity: number,
    opacityMaps: GroupValueMap<number>[],
    options?: {
      signal?: AbortSignal;
      loadTable?: (options?: { signal?: AbortSignal }) => Promise<TableData>;
    },
  ): Promise<Uint8Array> {
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // 1 value per R32UI texel
    return OpacityResolver.resolveOpacities(
      ref.itemIds,
      shapeOpacity,
      opacityMaps,
      defaultShapeOpacity,
      { ...options, align: numValuesPerTextureLine },
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
 * predicates compare against: every property they read has to be captured in
 * it. Layer- and object-level properties are read from the reference when
 * drawing, and are not part of the snapshot. The number of scanlines is the one the scanline
 * data texture was rasterized for, which is also the one the object is drawn
 * with.
 */
type RenderedShapes = RenderedObjectBase<Shapes, ShapesData> & {
  state: Pick<
    Shapes,
    | "dataSource"
    | "shapeFillColor"
    | "shapeFillVisibility"
    | "shapeFillOpacity"
    | "shapeStrokeColor"
    | "shapeStrokeVisibility"
    | "shapeStrokeOpacity"
  >;
  numScanlines: number;
  scanlineDataTexture: WebGLTexture;
  shapeFillColorsTexture: WebGLTexture;
  shapeStrokeColorsTexture: WebGLTexture;
};
