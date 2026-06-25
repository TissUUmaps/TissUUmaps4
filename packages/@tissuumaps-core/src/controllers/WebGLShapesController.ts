import { deepEqual } from "fast-equals";

import shapesFragmentShader from "../assets/shaders/shapes.frag?raw";
import shapesVertexShader from "../assets/shaders/shapes.vert?raw";
import {
  defaultRenderOptions,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
} from "../model/constants";
import type { Layer } from "../model/layer";
import type { Shapes } from "../model/shapes";
import type { Color, DefaultMap, RenderOptions } from "../model/types";
import type { ShapesData } from "../storage/shapes";
import type { TableData } from "../storage/table";
import type { Rect, ShapesGeometry } from "../types";
import { AsyncUtils } from "../utils/AsyncUtils";
import { MathUtils } from "../utils/MathUtils";
import { TransformUtils } from "../utils/TransformUtils";
import { WebGLUtils } from "../utils/WebGLUtils";
import { ColorDataUtils } from "../utils/data/ColorDataUtils";
import { OpacityDataUtils } from "../utils/data/OpacityDataUtils";
import { VisibilityDataUtils } from "../utils/data/VisibilityDataUtils";
import { WebGLControllerBase } from "./WebGLControllerBase";

/**
 * WebGL sub-controller for rendering two-dimensional shape clouds
 *
 * Shapes are rasterized on the GPU via a scanline-based algorithm. Each shapes
 * object is represented by a full-screen quad whose fragment shader samples a
 * scanline data texture to determine polygon membership, fill colors, and
 * stroke colors.
 */
export class WebGLShapesController extends WebGLControllerBase {
  private static readonly _scanlineDataTextureWidth = 4096; // see fragment shader
  private static readonly _shapeFillColorsTextureWidth = 4096; // see fragment shader
  private static readonly _shapeStrokeColorsTextureWidth = 4096; // see fragment shader

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
  private _numScanlines: number = defaultRenderOptions.numShapesScanlines;
  private _glShapes: GLShapes[] = [];

  /**
   * Creates the shader program and retrieves uniform locations
   *
   * @param gl - The WebGL 2 rendering context
   */
  constructor(gl: WebGL2RenderingContext) {
    super(gl);
    this._program = WebGLUtils.loadProgram(
      this.gl,
      shapesVertexShader,
      shapesFragmentShader,
    );
    this._uniformLocations = {
      viewportToWorldMatrix: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_viewportToWorldMatrix",
      ),
      worldToDataMatrix: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_worldToDataMatrix",
      ),
      strokeWidth: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_strokeWidth",
      ),
      numScanlines: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_numScanlines",
      ),
      objectBounds: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_objectBounds",
      ),
      scanlineData: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_scanlineData",
      ),
      shapeFillColors: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_shapeFillColors",
      ),
      shapeStrokeColors: WebGLUtils.getUniformLocation(
        this.gl,
        this._program,
        "u_shapeStrokeColors",
      ),
    };
  }

  /**
   * Updates the number of horizontal scanlines used for shape rasterization
   *
   * If the value changes, all existing scanline data textures are invalidated
   * and must be regenerated during the next {@link synchronize} call.
   *
   * @param numScanlines - New scanline count
   * @returns `true` if a re-synchronization is required (i.e. the value changed)
   */
  setNumScanlines(numScanlines: number): boolean {
    let sync = false;
    if (numScanlines !== this._numScanlines) {
      // invalidate scanline data textures
      for (const glShapes of this._glShapes) {
        if (glShapes.scanlineDataTexture !== undefined) {
          this.gl.deleteTexture(glShapes.scanlineDataTexture);
        }
        glShapes.scanlineDataTexture = undefined;
      }
      sync = true;
    }
    this._numScanlines = numScanlines;
    return sync;
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
   * @param getShapes - Async getter for shapes data
   * @param getTable - Async getter for table data
   * @param options - Optional abort signal
   */
  async synchronize(
    layers: Layer[],
    shapes: Shapes[],
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    getShapes: (
      shapesId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
    getTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<void> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();

    const refs = await this._loadShapes(layers, shapes, getShapes, getTable, {
      signal,
    });
    signal?.throwIfAborted();

    const glShapesByRef = this._cleanGLShapes(refs);

    this._glShapes = await this._createOrUpdateGLShapes(
      refs,
      glShapesByRef,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      getTable,
      { signal },
    );
    signal?.throwIfAborted();
  }

  /**
   * Issues the WebGL draw calls for all synchronized shapes
   *
   * Renders each shapes object as a full-screen quad whose fragment shader
   * performs scanline-based polygon rasterization using the per-object
   * scanline data texture.
   *
   * @param viewport - Current world-space viewport
   * @param renderOptions - Current render options (e.g. stroke width)
   */
  draw(viewport: Rect, renderOptions: RenderOptions): void {
    this.gl.useProgram(this._program);
    this.gl.uniformMatrix3x2fv(
      this._uniformLocations.viewportToWorldMatrix,
      false,
      TransformUtils.asGLMat3x2(
        WebGLShapesController.createViewportToWorldMatrix(viewport),
      ),
    );
    this.gl.uniform1ui(this._uniformLocations.numScanlines, this._numScanlines);
    this.gl.uniform1f(
      this._uniformLocations.strokeWidth,
      renderOptions.shapeStrokeWidth,
    );
    this.gl.uniform1i(this._uniformLocations.scanlineData, 1);
    this.gl.uniform1i(this._uniformLocations.shapeFillColors, 2);
    this.gl.uniform1i(this._uniformLocations.shapeStrokeColors, 3);
    WebGLUtils.enableAlphaBlending(this.gl);
    for (const glShapes of this._glShapes) {
      if (glShapes.scanlineDataTexture === undefined) {
        continue; // scanline data texture is currently being regenerated
      }
      const worldToDataMatrix = WebGLShapesController.createWorldToDataMatrix(
        glShapes.ref.shapes,
        glShapes.ref.layer,
      );
      this.gl.uniformMatrix3x2fv(
        this._uniformLocations.worldToDataMatrix,
        false,
        TransformUtils.asGLMat3x2(worldToDataMatrix),
      );
      this.gl.uniform4f(
        this._uniformLocations.objectBounds,
        glShapes.dataBounds.x,
        glShapes.dataBounds.y,
        glShapes.dataBounds.width,
        glShapes.dataBounds.height,
      );
      this.gl.activeTexture(this.gl.TEXTURE1);
      this.gl.bindTexture(this.gl.TEXTURE_2D, glShapes.scanlineDataTexture);
      this.gl.activeTexture(this.gl.TEXTURE2);
      this.gl.bindTexture(this.gl.TEXTURE_2D, glShapes.shapeFillColorsTexture);
      this.gl.activeTexture(this.gl.TEXTURE3);
      this.gl.bindTexture(
        this.gl.TEXTURE_2D,
        glShapes.shapeStrokeColorsTexture,
      );
      this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4);
    }
    WebGLUtils.disableAlphaBlending(this.gl);
    this.gl.useProgram(null);
  }

  /**
   * Computes the axis-aligned bounding box of all rendered shapes in world coordinates
   *
   * @returns Bounding box in world coordinates, or `null` if no shapes are rendered
   */
  getWorldBounds(): Rect | null {
    if (this._glShapes.length === 0) {
      return null;
    }
    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity;
    for (const glShapes of this._glShapes) {
      const transform = WebGLShapesController.createDataToWorldMatrix(
        glShapes.ref.shapes,
        glShapes.ref.layer,
      );
      const { x, y, width, height } = TransformUtils.transformBoundingBox(
        glShapes.dataBounds,
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

  /** Releases the shader program and all per-object GPU textures */
  destroy(): void {
    this.gl.deleteProgram(this._program);
    for (const glShapes of this._glShapes) {
      this._destroyGLShapes(glShapes);
    }
    this._glShapes = [];
  }

  /**
   * Loads shapes data for every layer
   *
   * Objects that fail to load are logged and skipped.
   *
   * @returns A flat list of resolved shapes references in layer order
   */
  private async _loadShapes(
    layers: Layer[],
    shapes: Shapes[],
    getShapes: (
      shapesId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
    getTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<ShapesRef[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const refs: ShapesRef[] = [];
    const dataCache = new Map<string, ShapesData | undefined>();
    const shapeLayersCache = new Map<string, Map<number, string> | undefined>();
    for (const layer of layers) {
      for (const currentShapes of shapes.filter(
        (x) => x.layer === layer.id || typeof x.layer !== "string",
      )) {
        let data;
        if (dataCache.has(currentShapes.id)) {
          data = dataCache.get(currentShapes.id);
        } else {
          try {
            data = await getShapes(currentShapes.id, { signal });
          } catch (error) {
            if (!signal?.aborted) {
              console.error(
                `Failed to load shapes with ID '${currentShapes.id}'`,
                error,
              );
            }
          } finally {
            signal?.throwIfAborted();
          }
          dataCache.set(currentShapes.id, data);
        }
        if (data === undefined || data.getSize() === 0) {
          continue;
        }

        let shapeLayers: Map<number, string> | undefined;
        if (
          typeof currentShapes.layer !== "string" &&
          currentShapes.dataSource.table !== undefined
        ) {
          const shapeLayersCacheKey = `${currentShapes.dataSource.table}:${currentShapes.layer.column}`;
          if (shapeLayersCache.has(shapeLayersCacheKey)) {
            shapeLayers = shapeLayersCache.get(shapeLayersCacheKey);
          } else {
            try {
              const tableData = await getTable(currentShapes.dataSource.table, {
                signal,
              });
              signal?.throwIfAborted();
              const tableIds = tableData.getIds();
              signal?.throwIfAborted();
              const tableLayers = await tableData.loadValues<string>(
                currentShapes.layer.column,
                { signal },
              );
              signal?.throwIfAborted();
              shapeLayers = new Map(
                tableIds.map((id, i) => [id, tableLayers[i]!]),
              );
            } catch (error) {
              if (!signal?.aborted) {
                console.error(
                  `Failed to load layers from table ${currentShapes.dataSource.table}`,
                  error,
                );
              }
            } finally {
              signal?.throwIfAborted();
            }
            shapeLayersCache.set(shapeLayersCacheKey, shapeLayers);
          }
          if (shapeLayers === undefined) {
            continue;
          }
        }

        const shapeIds = data.getIds();
        let shapeMask: boolean[] | undefined;
        let filteredShapeIds: number[];
        if (shapeLayers !== undefined) {
          const newShapeMask = new Array<boolean>(shapeIds.length);
          const newFilteredShapeIds: number[] = [];
          await AsyncUtils.forEach(
            shapeIds,
            (id, i) => {
              const include = shapeLayers.get(id) === layer.id;
              newShapeMask[i] = include;
              if (include) {
                newFilteredShapeIds.push(id);
              }
            },
            { signal },
          );
          signal?.throwIfAborted();
          if (newFilteredShapeIds.length === 0) {
            continue;
          }
          shapeMask = newShapeMask;
          filteredShapeIds = newFilteredShapeIds;
        } else {
          shapeMask = undefined;
          filteredShapeIds = shapeIds;
        }

        refs.push({
          data,
          layer,
          shapes: currentShapes,
          numShapes: filteredShapeIds.length,
          shapeMask,
          filteredShapeIds,
        });
      }
    }
    return refs;
  }

  /**
   * Removes GPU resources for shapes that are no longer referenced
   *
   * Matches existing GLShapes entries to the new set of refs. Entries that
   * still map to a ref are returned; entries without a match have their
   * textures destroyed.
   *
   * @returns Map from matched refs to their existing GLShapes entries
   */
  private _cleanGLShapes(refs: ShapesRef[]): Map<ShapesRef, GLShapes> {
    const glShapesByRef = new Map<ShapesRef, GLShapes>();
    for (let i = 0; i < this._glShapes.length; i++) {
      const glShapes = this._glShapes[i]!;
      const ref = refs.find(
        (ref) =>
          ref.layer.id === glShapes.ref.layer.id &&
          ref.shapes.id === glShapes.ref.shapes.id &&
          ref.numShapes === glShapes.ref.numShapes &&
          // check config.shapes.layer instead of ref.shapeMask and ref.filteredShapeIds
          deepEqual(ref.shapes.layer, glShapes.config.shapes.layer) &&
          deepEqual(ref.shapes.dataSource, glShapes.ref.shapes.dataSource),
      );
      if (ref !== undefined) {
        glShapesByRef.set(ref, glShapes);
      } else {
        const [glShapes] = this._glShapes.splice(i, 1);
        this._destroyGLShapes(glShapes!);
        i--;
      }
    }
    return glShapesByRef;
  }

  /**
   * Creates new GPU resources for shapes that have no existing GLShapes entry,
   * or updates existing ones when the model state has changed
   *
   * Scanline data textures are regenerated when the geometry or scanline count
   * changes. Color textures are regenerated when color, visibility, or opacity
   * configurations change.
   *
   * @returns The new ordered list of GLShapes entries
   */
  private async _createOrUpdateGLShapes(
    refs: ShapesRef[],
    glShapesByRef: Map<ShapesRef, GLShapes>,
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadTable: (
      tableId: string,
      options?: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options?: { signal?: AbortSignal },
  ): Promise<GLShapes[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const newGLShapes = [];
    for (const ref of refs) {
      const glShapes = glShapesByRef.get(ref);
      const { shapeMask, filteredShapeIds } = ref;
      let dataBounds = glShapes?.dataBounds;
      let scanlineDataTexture = glShapes?.scanlineDataTexture;
      if (
        glShapes === undefined ||
        dataBounds === undefined ||
        scanlineDataTexture === undefined
      ) {
        const geometry = await ref.data.loadGeometry({ signal });
        signal?.throwIfAborted();
        dataBounds = await WebGLShapesController._getDataBounds(
          geometry,
          shapeMask,
          { signal },
        );
        signal?.throwIfAborted();
        scanlineDataTexture = await this._createScanlineDataTexture(
          geometry,
          shapeMask,
          dataBounds,
          { signal },
        );
        signal?.throwIfAborted();
      }
      let shapeFillColorsTexture = glShapes?.shapeFillColorsTexture;
      if (
        glShapes === undefined ||
        shapeFillColorsTexture === undefined ||
        glShapes.config.layer.visibility !== ref.layer.visibility ||
        glShapes.config.layer.opacity !== ref.layer.opacity ||
        glShapes.config.shapes.visibility !== ref.shapes.visibility ||
        glShapes.config.shapes.opacity !== ref.shapes.opacity ||
        !deepEqual(
          glShapes.config.shapes.shapeFillVisibility,
          ref.shapes.shapeFillVisibility,
        ) ||
        !deepEqual(
          glShapes.config.shapes.shapeFillOpacity,
          ref.shapes.shapeFillOpacity,
        ) ||
        !deepEqual(
          glShapes.config.shapes.shapeFillColor,
          ref.shapes.shapeFillColor,
        )
      ) {
        shapeFillColorsTexture = await this._createShapeFillColorsTexture(
          ref,
          filteredShapeIds,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTable,
          { signal },
        );
        signal?.throwIfAborted();
      }
      let shapeStrokeColorsTexture = glShapes?.shapeStrokeColorsTexture;
      if (
        glShapes === undefined ||
        shapeStrokeColorsTexture === undefined ||
        glShapes.config.layer.visibility !== ref.layer.visibility ||
        glShapes.config.layer.opacity !== ref.layer.opacity ||
        glShapes.config.shapes.visibility !== ref.shapes.visibility ||
        glShapes.config.shapes.opacity !== ref.shapes.opacity ||
        !deepEqual(
          glShapes.config.shapes.shapeStrokeVisibility,
          ref.shapes.shapeStrokeVisibility,
        ) ||
        !deepEqual(
          glShapes.config.shapes.shapeStrokeOpacity,
          ref.shapes.shapeStrokeOpacity,
        ) ||
        !deepEqual(
          glShapes.config.shapes.shapeStrokeColor,
          ref.shapes.shapeStrokeColor,
        )
      ) {
        shapeStrokeColorsTexture = await this._createShapeStrokeColorsTexture(
          ref,
          filteredShapeIds,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTable,
          { signal },
        );
        signal?.throwIfAborted();
      }
      newGLShapes.push({
        ref,
        config: {
          layer: {
            visibility: ref.layer.visibility,
            opacity: ref.layer.opacity,
          },
          shapes: {
            layer: structuredClone(ref.shapes.layer),
            visibility: ref.shapes.visibility,
            opacity: ref.shapes.opacity,
            shapeFillColor: structuredClone(ref.shapes.shapeFillColor),
            shapeFillVisibility: structuredClone(
              ref.shapes.shapeFillVisibility,
            ),
            shapeFillOpacity: structuredClone(ref.shapes.shapeFillOpacity),
            shapeStrokeColor: structuredClone(ref.shapes.shapeStrokeColor),
            shapeStrokeVisibility: structuredClone(
              ref.shapes.shapeStrokeVisibility,
            ),
            shapeStrokeOpacity: structuredClone(ref.shapes.shapeStrokeOpacity),
          },
        },
        dataBounds,
        scanlineDataTexture,
        shapeFillColorsTexture,
        shapeStrokeColorsTexture,
      });
    }
    return newGLShapes;
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
      4 * WebGLShapesController._scanlineDataTextureWidth; // 4 values per RGBA32F texel
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      await WebGLShapesController._createScanlines(
        this._numScanlines,
        geometry,
        shapeMask,
        objectBounds,
        { signal },
      );
    signal?.throwIfAborted();
    const scanlineBuffer = await WebGLShapesController._packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
      { align: numValuesPerTextureLine, signal },
    );
    signal?.throwIfAborted();
    const scanlineData = new Float32Array(scanlineBuffer);
    const scanlineDataTexture = WebGLUtils.createDataTexture(
      this.gl,
      this.gl.RGBA32F,
      WebGLShapesController._scanlineDataTextureWidth,
      scanlineData.length / numValuesPerTextureLine,
      this.gl.RGBA,
      this.gl.FLOAT,
      scanlineData,
    );
    return scanlineDataTexture;
  }

  /**
   * Builds the fill color texture for a shapes object
   *
   * Resolves per-shape fill colors from the configuration, applies
   * visibility and opacity, packs into RGBA, and uploads as an R32UI texture.
   */
  private async _createShapeFillColorsTexture(
    ref: ShapesRef,
    shapeIds: number[],
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
      1 * WebGLShapesController._shapeFillColorsTextureWidth; // 1 value per R32UI texel
    let colorData;
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.shapes.visibility === false ||
      ref.shapes.opacity === 0
    ) {
      colorData = new Uint32Array(shapeIds.length).fill(0);
    } else {
      const visibilityData = await VisibilityDataUtils.loadVisibilityData(
        shapeIds,
        ref.shapes.shapeFillVisibility,
        visibilityMaps,
        defaultShapeFillVisibility,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: ref.shapes.dataSource.table,
        },
      );
      signal?.throwIfAborted();
      const opacityData = await OpacityDataUtils.loadOpacityData(
        shapeIds,
        ref.shapes.shapeFillOpacity,
        opacityMaps,
        defaultShapeFillOpacity,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: ref.shapes.dataSource.table,
          opacityFactor: ref.layer.opacity * ref.shapes.opacity,
        },
      );
      signal?.throwIfAborted();
      colorData = await ColorDataUtils.loadColorData(
        shapeIds,
        ref.shapes.shapeFillColor,
        colorMaps,
        defaultShapeFillColor,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: ref.shapes.dataSource.table,
          visibilityData,
          opacityData,
        },
      );
      signal?.throwIfAborted();
    }
    const shapeFillColorsTexture = WebGLUtils.createDataTexture(
      this.gl,
      this.gl.R32UI,
      WebGLShapesController._shapeFillColorsTextureWidth,
      colorData.length / numValuesPerTextureLine,
      this.gl.RED_INTEGER,
      this.gl.UNSIGNED_INT,
      colorData,
    );
    return shapeFillColorsTexture;
  }

  /**
   * Builds the stroke color texture for a shapes object
   *
   * Resolves per-shape stroke colors from the configuration, applies
   * visibility and opacity, packs into RGBA, and uploads as an R32UI texture.
   */
  private async _createShapeStrokeColorsTexture(
    ref: ShapesRef,
    shapeIds: number[],
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
      1 * WebGLShapesController._shapeStrokeColorsTextureWidth; // 1 value per R32UI texel
    let colorData;
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.shapes.visibility === false ||
      ref.shapes.opacity === 0
    ) {
      colorData = new Uint32Array(shapeIds.length).fill(0);
    } else {
      const visibilityData = await VisibilityDataUtils.loadVisibilityData(
        shapeIds,
        ref.shapes.shapeStrokeVisibility,
        visibilityMaps,
        defaultShapeStrokeVisibility,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: ref.shapes.dataSource.table,
        },
      );
      signal?.throwIfAborted();
      const opacityData = await OpacityDataUtils.loadOpacityData(
        shapeIds,
        ref.shapes.shapeStrokeOpacity,
        opacityMaps,
        defaultShapeStrokeOpacity,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: ref.shapes.dataSource.table,
          opacityFactor: ref.layer.opacity * ref.shapes.opacity,
        },
      );
      signal?.throwIfAborted();
      colorData = await ColorDataUtils.loadColorData(
        shapeIds,
        ref.shapes.shapeStrokeColor,
        colorMaps,
        defaultShapeStrokeColor,
        loadTable,
        {
          signal,
          align: numValuesPerTextureLine,
          table: ref.shapes.dataSource.table,
          visibilityData,
          opacityData,
        },
      );
      signal?.throwIfAborted();
    }
    const shapeStrokeColorsTexture = WebGLUtils.createDataTexture(
      this.gl,
      this.gl.R32UI,
      WebGLShapesController._shapeStrokeColorsTextureWidth,
      colorData.length / numValuesPerTextureLine,
      this.gl.RED_INTEGER,
      this.gl.UNSIGNED_INT,
      colorData,
    );
    return shapeStrokeColorsTexture;
  }

  /** Deletes all GPU textures owned by a single GLShapes entry */
  private _destroyGLShapes(glShapes: GLShapes): void {
    if (glShapes.scanlineDataTexture !== undefined) {
      this.gl.deleteTexture(glShapes.scanlineDataTexture);
    }
    this.gl.deleteTexture(glShapes.shapeFillColorsTexture);
    this.gl.deleteTexture(glShapes.shapeStrokeColorsTexture);
  }

  /**
   * Computes the axis-aligned bounding box of all (included) shapes
   *
   * @param geometry - Geometry for all shapes in the object
   * @param shapeMask - Per-shape inclusion mask, or `undefined` if all shapes are included
   * @returns The bounding rectangle in data-space coordinates
   */
  private static async _getDataBounds(
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

  /**
   * Rasterizes shapes into horizontal scanlines
   *
   * For each scanline, determines which shapes and edges intersect it,
   * computes per-scanline/per-shape bounding boxes, and builds a 128-bit
   * occupancy mask for fast skip-testing in the fragment shader.
   *
   * @param numScanlines - Number of horizontal scanlines
   * @param geometry - Geometry for all shapes in the object
   * @param shapeMask - Per-shape inclusion mask, or `undefined` if all shapes are included
   * @param objectBounds - Bounding box of all shapes
   * @returns Scanlines with per-shape edges, and total counts for buffer sizing
   */
  private static async _createScanlines(
    numScanlines: number,
    geometry: ShapesGeometry,
    shapeMask: boolean[] | undefined,
    objectBounds: Rect,
    options?: { signal?: AbortSignal },
  ): Promise<{
    scanlines: Scanline[];
    totalNumScanlineShapes: number;
    totalNumScanlineShapeEdges: number;
  }> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const {
      shapePolygonOffsets,
      polygonRingOffsets,
      ringVertexOffsets,
      coords,
    } = geometry;
    const scanlines: Scanline[] = Array.from({ length: numScanlines }, () => ({
      xMin: Infinity,
      xMax: -Infinity,
      shapes: new Map<number, ScanlineShape>(),
      occupancyMask: [0, 0, 0, 0],
    }));
    let totalNumScanlineShapes = 0;
    let totalNumScanlineShapeEdges = 0;
    const maybeYield = AsyncUtils.createYielder({ signal });
    let shapeIndex = 0; // compacted index over included shapes
    for (let s = 0; s < shapePolygonOffsets.length - 1; s++) {
      if (shapeMask !== undefined && !shapeMask[s]) {
        continue;
      }
      const shapePolygonStart = shapePolygonOffsets[s]!;
      const shapePolygonEnd = shapePolygonOffsets[s + 1]!;
      for (let p = shapePolygonStart; p < shapePolygonEnd; p++) {
        const polygonRingStart = polygonRingOffsets[p]!;
        const polygonRingEnd = polygonRingOffsets[p + 1]!;
        // compute shape xMin/xMax/occupancy mask
        let xMin = Infinity,
          yMin = Infinity,
          xMax = -Infinity,
          yMax = -Infinity;
        const shellVertexStart = ringVertexOffsets[polygonRingStart]!;
        const shellVertexEnd = ringVertexOffsets[polygonRingStart + 1]!;
        for (let v = shellVertexStart; v < shellVertexEnd; v++) {
          const x = coords[2 * v]!;
          const y = coords[2 * v + 1]!;
          xMin = Math.min(xMin, x);
          yMin = Math.min(yMin, y);
          xMax = Math.max(xMax, x);
          yMax = Math.max(yMax, y);
        }
        const firstScanlineIndex = MathUtils.clamp(
          Math.floor(
            (numScanlines * (yMin - objectBounds.y)) / objectBounds.height,
          ),
          0,
          numScanlines - 1,
        );
        const lastScanlineIndex = MathUtils.clamp(
          Math.ceil(
            (numScanlines * (yMax - objectBounds.y)) / objectBounds.height,
          ),
          0,
          numScanlines - 1,
        );
        const firstOccupancyMaskBin = MathUtils.clamp(
          Math.floor((128 * (xMin - objectBounds.x)) / objectBounds.width),
          0,
          127,
        );
        const lastOccupancyMaskBin = MathUtils.clamp(
          Math.ceil((128 * (xMax - objectBounds.x)) / objectBounds.width),
          0,
          127,
        );
        for (
          let scanlineIndex = firstScanlineIndex;
          scanlineIndex <= lastScanlineIndex;
          scanlineIndex++
        ) {
          const scanline = scanlines[scanlineIndex]!;
          scanline.xMin = Math.min(scanline.xMin, xMin);
          scanline.xMax = Math.max(scanline.xMax, xMax);
          // TODO Compute per-scanline occupancy mask bin ranges for better precision
          // (i.e. accurately rasterize shapes instead of just their bounding boxes).
          // Also, consider rasterizing holes (temporary per-shape occupancy masks).
          for (
            let occupancyMaskBin = firstOccupancyMaskBin;
            occupancyMaskBin <= lastOccupancyMaskBin;
            occupancyMaskBin++
          ) {
            const occupancyMaskIndex = occupancyMaskBin >> 5;
            scanline.occupancyMask[occupancyMaskIndex] = MathUtils.safeOr(
              scanline.occupancyMask[occupancyMaskIndex]!,
              MathUtils.safeLeftShift(1, occupancyMaskBin & 0x1f),
            );
          }
          const scanlineShape = scanline.shapes.get(shapeIndex);
          if (scanlineShape === undefined) {
            scanline.shapes.set(shapeIndex, {
              xMin: xMin,
              xMax: xMax,
              edges: [],
            });
            totalNumScanlineShapes++;
          } else {
            scanlineShape.xMin = Math.min(scanlineShape.xMin, xMin);
            scanlineShape.xMax = Math.max(scanlineShape.xMax, xMax);
          }
        }
        // add shape edges to scanlines
        for (let r = polygonRingStart; r < polygonRingEnd; r++) {
          const ringVertexStart = ringVertexOffsets[r]!;
          const ringVertexEnd = ringVertexOffsets[r + 1]!;
          const nRingVertices = ringVertexEnd - ringVertexStart;
          for (let i = 0; i < nRingVertices; ++i) {
            const v0 = ringVertexStart + ((i + 0) % nRingVertices);
            const v1 = ringVertexStart + ((i + 1) % nRingVertices);
            const v0x = coords[2 * v0]!;
            const v0y = coords[2 * v0 + 1]!;
            const v1x = coords[2 * v1]!;
            const v1y = coords[2 * v1 + 1]!;
            if (v0x === v1x && v0y === v1y) {
              continue; // ignore zero-length edges
            }
            const firstEdgeScanlineIndex = MathUtils.clamp(
              Math.floor(
                (numScanlines * (Math.min(v0y, v1y) - objectBounds.y)) /
                  objectBounds.height,
              ),
              0,
              numScanlines - 1,
            );
            const lastEdgeScanlineIndex = MathUtils.clamp(
              Math.ceil(
                (numScanlines * (Math.max(v0y, v1y) - objectBounds.y)) /
                  objectBounds.height,
              ),
              0,
              numScanlines - 1,
            );
            for (
              let scanlineIndex = firstEdgeScanlineIndex;
              scanlineIndex <= lastEdgeScanlineIndex;
              scanlineIndex++
            ) {
              const scanline = scanlines[scanlineIndex]!;
              const scanlineShape = scanline.shapes.get(shapeIndex)!;
              scanlineShape.edges.push({ v0x, v0y, v1x, v1y });
              totalNumScanlineShapeEdges++;
            }
          }
        }
      }
      await maybeYield();
      shapeIndex++;
    }
    return { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges };
  }

  /**
   * Packs scanline data into a flat {@link ArrayBuffer} suitable for
   * uploading as a GPU texture
   *
   * The layout matches what the fragment shader expects:
   * - Header region: one texel per scanline (offset + shape count + xMin/xMax)
   * - Per-scanline data: occupancy mask, then per-shape headers and edges
   *
   * @param scanlines - Rasterized scanlines from {@link _createScanlines}
   * @param totalNumScanlineShapes - Total shape entries across all scanlines
   * @param totalNumScanlineShapeEdges - Total edge entries across all scanlines
   * @param options - Optional buffer alignment (to texture line boundaries) and abort signal
   */
  private static async _packScanlines(
    scanlines: Scanline[],
    totalNumScanlineShapes: number,
    totalNumScanlineShapeEdges: number,
    options?: { align?: number; signal?: AbortSignal },
  ): Promise<ArrayBuffer> {
    const { align = 1, signal } = options ?? {};
    signal?.throwIfAborted();
    const buffer = new ArrayBuffer(
      MathUtils.align(
        4 * scanlines.length + // header -> scanline info S
          4 * scanlines.length + // scanline S -> scanline header
          4 * totalNumScanlineShapes + // scanline S -> shape P -> shape header
          4 * totalNumScanlineShapeEdges, // scanline S -> shape P -> edge E
        align,
      ) * 4, // 4 bytes per 32-bit value
    );
    const float32Data = new Float32Array(buffer);
    const uint32Data = new Uint32Array(buffer);
    let currentScanlineTexelOffset = scanlines.length;
    const maybeYield = AsyncUtils.createYielder({ signal });
    for (let s = 0; s < scanlines.length; s++) {
      const scanline = scanlines[s]!;
      // header
      uint32Data.set([currentScanlineTexelOffset, scanline.shapes.size], 4 * s);
      float32Data.set([scanline.xMin, scanline.xMax], 4 * s + 2);
      // scanline
      uint32Data.set(scanline.occupancyMask, 4 * currentScanlineTexelOffset);
      let currentScanlineShapeTexelOffset = currentScanlineTexelOffset + 1;
      for (const [shapeIndex, scanlineShape] of scanline.shapes) {
        // scanline shape
        uint32Data.set(
          [shapeIndex, scanlineShape.edges.length],
          4 * currentScanlineShapeTexelOffset,
        );
        float32Data.set(
          [scanlineShape.xMin, scanlineShape.xMax],
          4 * currentScanlineShapeTexelOffset + 2,
        );
        let currentScanlineShapeEdgeTexelOffset =
          currentScanlineShapeTexelOffset + 1;
        for (const scanlineShapeEdge of scanlineShape.edges) {
          // scanline shape edge
          float32Data.set(
            [
              scanlineShapeEdge.v0x,
              scanlineShapeEdge.v0y,
              scanlineShapeEdge.v1x,
              scanlineShapeEdge.v1y,
            ],
            4 * currentScanlineShapeEdgeTexelOffset,
          );
          currentScanlineShapeEdgeTexelOffset++;
        }
        currentScanlineShapeTexelOffset = currentScanlineShapeEdgeTexelOffset;
      }
      currentScanlineTexelOffset = currentScanlineShapeTexelOffset;
      await maybeYield();
    }
    return buffer;
  }
}

/** Binding of a shapes data object to a specific layer */
type ShapesRef = {
  layer: Layer;
  shapes: Shapes;
  numShapes: number;
  shapeMask: boolean[] | undefined;
  filteredShapeIds: number[];
  data: ShapesData;
};

/**
 * GPU state for a single shapes object
 *
 * Holds texture handles for scanline data, fill colors, and stroke colors,
 * plus a snapshot of the model values used to generate them (for incremental
 * update detection).
 */
type GLShapes = {
  /** Reference to the shapes object this GPU state represents */
  ref: ShapesRef;
  /** Snapshot of model values at the time of the last texture upload */
  config: {
    layer: Pick<Layer, "visibility" | "opacity">;
    shapes: Pick<
      Shapes,
      | "layer"
      | "visibility"
      | "opacity"
      | "shapeFillColor"
      | "shapeFillVisibility"
      | "shapeFillOpacity"
      | "shapeStrokeColor"
      | "shapeStrokeVisibility"
      | "shapeStrokeOpacity"
    >;
  };
  /** Axis-aligned bounding box of all shapes in data-space coordinates */
  dataBounds: Rect;
  /** Scanline data texture (RGBA32F); `undefined` while being regenerated */
  scanlineDataTexture?: WebGLTexture;
  /** Per-shape fill color texture (R32UI) */
  shapeFillColorsTexture: WebGLTexture;
  /** Per-shape stroke color texture (R32UI) */
  shapeStrokeColorsTexture: WebGLTexture;
};

/** A single horizontal scanline containing shape intersection data */
type Scanline = {
  /** Minimum X coordinate across all shapes intersecting this scanline */
  xMin: number;
  /** Maximum X coordinate across all shapes intersecting this scanline */
  xMax: number;
  /** Per-shape intersection data, keyed by shape index */
  shapes: Map<number, ScanlineShape>;
  /** 128-bit bitmask for fast horizontal skip-testing in the fragment shader */
  occupancyMask: ScanlineOccupancyMask;
};

/** Per-shape data within a single scanline */
type ScanlineShape = {
  /** Minimum X coordinate of this shape within the scanline */
  xMin: number;
  /** Maximum X coordinate of this shape within the scanline */
  xMax: number;
  /** Polygon edges that intersect this scanline */
  edges: ScanlineShapeEdge[];
};

/** A polygon edge intersecting a scanline, defined by its two endpoints */
type ScanlineShapeEdge = {
  /** X coordinate of the first endpoint */
  v0x: number;
  /** Y coordinate of the first endpoint */
  v0y: number;
  /** X coordinate of the second endpoint */
  v1x: number;
  /** Y coordinate of the second endpoint */
  v1y: number;
};

/** A 128-bit occupancy mask stored as four 32-bit integers */
type ScanlineOccupancyMask = [number, number, number, number];
