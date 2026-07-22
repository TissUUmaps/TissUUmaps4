import { deepEqual } from "fast-equals";

import {
  AsyncUtils,
  type Color,
  type ColorConfig,
  type DefaultMap,
  type Layer,
  type OpacityConfig,
  type Rect,
  type Shapes,
  type ShapesData,
  type ShapesGeometry,
  type TableData,
  type VisibilityConfig,
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
import type { WebGLShapesRenderOptions } from "./WebGLOptions";
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
   * Sets the options for the renderer and returns whether a sync is needed
   *
   * @param options - The options to set for the renderer
   * @returns An object indicating whether a sync and/or draw is needed
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
   * @param colorMaps - Project-global color maps for {@link GroupByConfig} resolution
   * @param visibilityMaps - Project-global visibility maps
   * @param opacityMaps - Project-global opacity maps
   * @param loadShapes - Async getter for shapes data
   * @param loadTable - Async getter for table data
   * @param options - Optional abort signal
   */
  async synchronize(
    layers: Layer[],
    shapes: Shapes[],
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadShapes: (
      shapesId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
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
      shapes,
      loadShapes,
      loadTable,
      { signal },
    );
    const renderedShapesByNewRef = this._cleanRenderedShapes(newRefs);
    this.renderedObjects = await this._createOrUpdateRenderedShapes(
      newRefs,
      renderedShapesByNewRef,
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
        renderedShapes.ref.object,
        renderedShapes.ref.layer,
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
   * Removes GPU resources for shapes that are no longer referenced
   *
   * Matches existing render passes to the new set of refs. Entries that
   * still map to a ref are returned; entries without a match have their
   * textures destroyed.
   *
   * @returns Map from matched refs to their existing render passes
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
          // check layer configuration instead of shapeMask and filteredShapeIds
          deepEqual(renderedShapes.state.shapes.layer, newRef.object.layer) &&
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
   * Scanline data textures are regenerated when the geometry or scanline count
   * changes. Color textures are regenerated when color, visibility, or opacity
   * configurations change.
   *
   * @returns The new ordered list of render passes
   */
  private async _createOrUpdateRenderedShapes(
    newRefs: ShapesRef[],
    renderedShapesByNewRef: Map<ShapesRef, RenderedShapes>,
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<RenderedShapes[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newRenderedShapes: RenderedShapes[] = [];
    for (const newRef of newRefs) {
      const renderedShapes = renderedShapesByNewRef.get(newRef);
      let objectBounds = renderedShapes?.objectBounds;
      let scanlineDataTexture = renderedShapes?.scanlineDataTexture;
      if (
        renderedShapes === undefined ||
        objectBounds === undefined ||
        scanlineDataTexture === undefined
      ) {
        const geometry = await newRef.data.loadGeometry({ signal });
        objectBounds = await WebGLShapesRenderer._getObjectBounds(
          geometry,
          newRef.itemMask,
          { signal },
        );
        if (scanlineDataTexture !== undefined) {
          this.context.gl.deleteTexture(scanlineDataTexture);
        }
        scanlineDataTexture = await this._createScanlineDataTexture(
          geometry,
          newRef.itemMask,
          objectBounds,
          { signal },
        );
      }
      let shapeFillColorsTexture = renderedShapes?.shapeFillColorsTexture;
      if (
        renderedShapes === undefined ||
        shapeFillColorsTexture === undefined ||
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
      ) {
        if (shapeFillColorsTexture !== undefined) {
          this.context.gl.deleteTexture(shapeFillColorsTexture);
        }
        shapeFillColorsTexture = await this._createShapeColorsTexture(
          newRef,
          newRef.object.shapeFillVisibility,
          newRef.object.shapeFillOpacity,
          newRef.object.shapeFillColor,
          defaultShapeFillVisibility,
          defaultShapeFillOpacity,
          defaultShapeFillColor,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTable,
          { signal },
        );
      }
      let shapeStrokeColorsTexture = renderedShapes?.shapeStrokeColorsTexture;
      if (
        renderedShapes === undefined ||
        shapeStrokeColorsTexture === undefined ||
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
      ) {
        if (shapeStrokeColorsTexture !== undefined) {
          this.context.gl.deleteTexture(shapeStrokeColorsTexture);
        }
        shapeStrokeColorsTexture = await this._createShapeColorsTexture(
          newRef,
          newRef.object.shapeStrokeVisibility,
          newRef.object.shapeStrokeOpacity,
          newRef.object.shapeStrokeColor,
          defaultShapeStrokeVisibility,
          defaultShapeStrokeOpacity,
          defaultShapeStrokeColor,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTable,
          { signal },
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
            layer: structuredClone(newRef.object.layer),
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
   * Deletes all GPU textures owned by a single render pass
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
   * @param shapeMask - Per-shape inclusion mask, or `undefined` if all shapes are included
   * @param objectBounds - Axis-aligned bounding box of all shapes
   */
  private async _createScanlineDataTexture(
    geometry: ShapesGeometry,
    shapeMask: boolean[] | undefined,
    objectBounds: Rect,
    options?: { signal?: AbortSignal },
  ): Promise<WebGLTexture> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const numValuesPerTextureLine =
      4 * WebGLShapesRenderer._scanlineDataTextureWidth; // 4 values per RGBA32F texel
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesRasterizer.createScanlines(
        this._numScanlines,
        geometry,
        shapeMask,
        objectBounds,
        { signal },
      );
    const scanlineBuffer = await WebGLShapesRasterizer.packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
      { align: numValuesPerTextureLine, signal },
    );
    const scanlineData = new Float32Array(scanlineBuffer);
    const scanlineDataTexture = this.context.createDataTexture(
      WebGL2RenderingContext.RGBA32F,
      WebGLShapesRenderer._scanlineDataTextureWidth,
      scanlineData.length / numValuesPerTextureLine,
      WebGL2RenderingContext.RGBA,
      WebGL2RenderingContext.FLOAT,
      scanlineData,
    );
    return scanlineDataTexture;
  }

  /**
   * Builds the fill/stroke color texture for a shapes object
   *
   * Resolves per-shape fill/stroke colors from the configuration, applies
   * visibility and opacity, packs into RGBA, and uploads as an R32UI texture.
   */
  private async _createShapeColorsTexture(
    newRef: ShapesRef,
    shapeVisibility: VisibilityConfig,
    shapeOpacity: OpacityConfig,
    shapeColor: ColorConfig,
    defaultShapeVisibility: boolean,
    defaultShapeOpacity: number,
    defaultShapeColor: Color,
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<WebGLTexture> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const numValuesPerTextureLine =
      1 * WebGLShapesRenderer._shapeColorsTextureWidth; // 1 value per R32UI texel
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
        shapeVisibility,
        visibilityMaps,
        defaultShapeVisibility,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: newRef.object.dataSource.table,
        },
      );
      const opacityData = await OpacityResolver.resolveOpacities(
        newRef.filteredItemIds,
        shapeOpacity,
        opacityMaps,
        defaultShapeOpacity,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: newRef.object.dataSource.table,
          opacityFactor: newRef.layer.opacity * newRef.object.opacity,
        },
      );
      colorData = await ColorResolver.resolveColors(
        newRef.filteredItemIds,
        shapeColor,
        colorMaps,
        defaultShapeColor,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: newRef.object.dataSource.table,
          visibilities: visibilityData,
          opacities: opacityData,
        },
      );
    }
    const shapeColorsTexture = this.context.createDataTexture(
      WebGL2RenderingContext.R32UI,
      WebGLShapesRenderer._shapeColorsTextureWidth,
      colorData.length / numValuesPerTextureLine,
      WebGL2RenderingContext.RED_INTEGER,
      WebGL2RenderingContext.UNSIGNED_INT,
      colorData,
    );
    return shapeColorsTexture;
  }

  /**
   * Computes the axis-aligned bounding box of all (included) shapes
   *
   * @param geometry - Geometry for all shapes in the object
   * @param shapeMask - Per-shape inclusion mask, or `undefined` if all shapes are included
   * @returns The bounding rectangle in data-space coordinates
   * @throws Error if the geometry is empty or has zero width/height
   */
  private static async _getObjectBounds(
    geometry: ShapesGeometry,
    shapeMask: boolean[] | undefined,
    options?: { signal?: AbortSignal },
  ): Promise<Rect> {
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
    const maybeYield = AsyncUtils.createYielder({ signal });
    for (let s = 0; s < shapePolygonOffsets.length - 1; s++) {
      if (shapeMask !== undefined && !shapeMask[s]) {
        continue;
      }
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
      await maybeYield();
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
      throw new Error(
        "Shapes geometry bounds must have non-zero width and height",
      );
    }
    return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
  }
}

/**
 * Reference to a shapes object and its associated data
 */
type ShapesRef = ObjectRef<Shapes, ShapesData>;

/**
 * GPU state for a single shapes object
 *
 * Holds texture handles for scanline data, fill colors, and stroke colors,
 * plus a snapshot of the model values used to generate them (for incremental
 * update detection).
 */
type RenderedShapes = RenderedObjectBase<Shapes, ShapesData> & {
  state: {
    layer: Pick<Layer, "visibility" | "opacity" | "transform">;
    shapes: Pick<
      Shapes,
      | "layer"
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
