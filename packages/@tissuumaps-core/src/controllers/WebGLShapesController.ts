import { deepEqual } from "fast-equals";

import shapesFragmentShader from "../assets/shaders/shapes.frag?raw";
import shapesVertexShader from "../assets/shaders/shapes.vert?raw";
import {
  defaultDrawOptions,
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
} from "../model/constants";
import { type Layer } from "../model/layer";
import { type Shapes, type ShapesLayerConfig } from "../model/shapes";
import { type Color, type DefaultMap, type DrawOptions } from "../model/types";
import { type ShapesData } from "../storage/shapes";
import { type TableData } from "../storage/table";
import { type MultiPolygon, type Rect, type Vertex } from "../types";
import { LoadUtils } from "../utils/LoadUtils";
import { MathUtils } from "../utils/MathUtils";
import { TransformUtils } from "../utils/TransformUtils";
import { WebGLUtils } from "../utils/WebGLUtils";
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
  private _numScanlines: number = defaultDrawOptions.numShapesScanlines;
  private _glShapes: GLShapes[] = [];

  /**
   * Creates the shader program and retrieves uniform locations
   *
   * @param gl - The WebGL 2 rendering context
   */
  constructor(gl: WebGL2RenderingContext) {
    super(gl);
    this._program = WebGLUtils.loadProgram(
      this._gl,
      shapesVertexShader,
      shapesFragmentShader,
    );
    this._uniformLocations = {
      viewportToWorldMatrix: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_viewportToWorldMatrix",
      ),
      worldToDataMatrix: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_worldToDataMatrix",
      ),
      strokeWidth: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_strokeWidth",
      ),
      numScanlines: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_numScanlines",
      ),
      objectBounds: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_objectBounds",
      ),
      scanlineData: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_scanlineData",
      ),
      shapeFillColors: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_shapeFillColors",
      ),
      shapeStrokeColors: WebGLUtils.getUniformLocation(
        this._gl,
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
          this._gl.deleteTexture(glShapes.scanlineDataTexture);
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
   * @param loadShapes - Async loader for shapes data
   * @param loadTable - Async loader for table data
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
      options: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<void> {
    signal?.throwIfAborted();
    const refs = await this._loadShapes(layers, shapes, loadShapes, { signal });
    signal?.throwIfAborted();
    const glShapesByRef = this._cleanGLShapes(refs);
    this._glShapes = await this._createOrUpdateGLShapes(
      refs,
      glShapesByRef,
      colorMaps,
      visibilityMaps,
      opacityMaps,
      loadTable,
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
   * @param drawOptions - Current draw options (e.g. stroke width)
   */
  draw(viewport: Rect, drawOptions: DrawOptions): void {
    this._gl.useProgram(this._program);
    this._gl.uniformMatrix3x2fv(
      this._uniformLocations.viewportToWorldMatrix,
      false,
      TransformUtils.asGLMat3x2(
        WebGLShapesController.createViewportToWorldMatrix(viewport),
      ),
    );
    this._gl.uniform1ui(
      this._uniformLocations.numScanlines,
      this._numScanlines,
    );
    this._gl.uniform1f(
      this._uniformLocations.strokeWidth,
      drawOptions.shapeStrokeWidth,
    );
    this._gl.uniform1i(this._uniformLocations.scanlineData, 1);
    this._gl.uniform1i(this._uniformLocations.shapeFillColors, 2);
    this._gl.uniform1i(this._uniformLocations.shapeStrokeColors, 3);
    WebGLUtils.enableAlphaBlending(this._gl);
    for (const glShapes of this._glShapes) {
      if (glShapes.scanlineDataTexture === undefined) {
        continue; // scanline data texture is currently being regenerated
      }
      const worldToDataMatrix = WebGLShapesController.createWorldToDataMatrix(
        glShapes.ref.layer,
        glShapes.ref.layerConfig,
      );
      this._gl.uniformMatrix3x2fv(
        this._uniformLocations.worldToDataMatrix,
        false,
        TransformUtils.asGLMat3x2(worldToDataMatrix),
      );
      this._gl.uniform4f(
        this._uniformLocations.objectBounds,
        glShapes.objectBounds.x,
        glShapes.objectBounds.y,
        glShapes.objectBounds.width,
        glShapes.objectBounds.height,
      );
      this._gl.activeTexture(this._gl.TEXTURE1);
      this._gl.bindTexture(this._gl.TEXTURE_2D, glShapes.scanlineDataTexture);
      this._gl.activeTexture(this._gl.TEXTURE2);
      this._gl.bindTexture(
        this._gl.TEXTURE_2D,
        glShapes.shapeFillColorsTexture,
      );
      this._gl.activeTexture(this._gl.TEXTURE3);
      this._gl.bindTexture(
        this._gl.TEXTURE_2D,
        glShapes.shapeStrokeColorsTexture,
      );
      this._gl.drawArrays(this._gl.TRIANGLE_STRIP, 0, 4);
    }
    WebGLUtils.disableAlphaBlending(this._gl);
    this._gl.useProgram(null);
  }

  /** Releases the shader program and all per-object GPU textures */
  destroy(): void {
    this._gl.deleteProgram(this._program);
    for (const glShapes of this._glShapes) {
      this._destroyGLShapes(glShapes);
    }
    this._glShapes = [];
  }

  /**
   * Loads shapes data for every layer configuration matching the given layers
   *
   * Objects that fail to load are logged and skipped.
   *
   * @returns A flat list of resolved shapes references in layer order
   */
  private async _loadShapes(
    layers: Layer[],
    shapes: Shapes[],
    loadShapes: (
      shapesId: string,
      options: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<ShapesRef[]> {
    signal?.throwIfAborted();
    const refs: ShapesRef[] = [];
    for (const layer of layers) {
      for (const currentShapes of shapes) {
        for (let i = 0; i < currentShapes.layerConfigs.length; i++) {
          const layerConfig = currentShapes.layerConfigs[i]!;
          if (layerConfig.layer !== layer.id) {
            continue;
          }
          let data;
          try {
            data = await loadShapes(currentShapes.id, { signal });
          } catch (error) {
            console.error(
              `Failed to load shapes with ID '${currentShapes.id}'`,
              error,
            );
          }
          signal?.throwIfAborted();
          if (data !== undefined) {
            refs.push({
              layer,
              shapes: currentShapes,
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
          ref.layerConfigIndex === glShapes.ref.layerConfigIndex,
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
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<GLShapes[]> {
    signal?.throwIfAborted();
    const newGLShapes = [];
    for (const ref of refs) {
      const numShapes = ref.data.getLength();
      const glShapes = glShapesByRef.get(ref);
      let objectBounds = glShapes?.objectBounds;
      let scanlineDataTexture = glShapes?.scanlineDataTexture;
      if (
        glShapes === undefined ||
        objectBounds === undefined ||
        scanlineDataTexture === undefined ||
        glShapes.numShapes !== numShapes
      ) {
        const multiPolygons = await ref.data.loadMultiPolygons({ signal });
        signal?.throwIfAborted();
        objectBounds = WebGLShapesController._getObjectBounds(multiPolygons);
        scanlineDataTexture = this._createScanlineDataTexture(
          multiPolygons,
          objectBounds,
        );
        signal?.throwIfAborted();
      }
      let shapeFillColorsTexture = glShapes?.shapeFillColorsTexture;
      if (
        glShapes === undefined ||
        shapeFillColorsTexture === undefined ||
        glShapes.current.layer.visibility !== ref.layer.visibility ||
        glShapes.current.layer.opacity !== ref.layer.opacity ||
        glShapes.current.shapes.visibility !== ref.shapes.visibility ||
        glShapes.current.shapes.opacity !== ref.shapes.opacity ||
        !deepEqual(
          glShapes.current.shapes.shapeFillVisibility,
          ref.shapes.shapeFillVisibility,
        ) ||
        !deepEqual(
          glShapes.current.shapes.shapeFillOpacity,
          ref.shapes.shapeFillOpacity,
        ) ||
        !deepEqual(
          glShapes.current.shapes.shapeFillColor,
          ref.shapes.shapeFillColor,
        )
      ) {
        shapeFillColorsTexture = await this._createShapeFillColorsTexture(
          ref,
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
        glShapes.current.layer.visibility !== ref.layer.visibility ||
        glShapes.current.layer.opacity !== ref.layer.opacity ||
        glShapes.current.shapes.visibility !== ref.shapes.visibility ||
        glShapes.current.shapes.opacity !== ref.shapes.opacity ||
        !deepEqual(
          glShapes.current.shapes.shapeStrokeVisibility,
          ref.shapes.shapeStrokeVisibility,
        ) ||
        !deepEqual(
          glShapes.current.shapes.shapeStrokeOpacity,
          ref.shapes.shapeStrokeOpacity,
        ) ||
        !deepEqual(
          glShapes.current.shapes.shapeStrokeColor,
          ref.shapes.shapeStrokeColor,
        )
      ) {
        shapeStrokeColorsTexture = await this._createShapeStrokeColorsTexture(
          ref,
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
        numShapes,
        objectBounds,
        scanlineDataTexture,
        shapeFillColorsTexture,
        shapeStrokeColorsTexture,
        current: {
          layer: {
            visibility: ref.layer.visibility,
            opacity: ref.layer.opacity,
          },
          shapes: {
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
      });
    }
    return newGLShapes;
  }

  /**
   * Builds the scanline data texture for a shapes object
   *
   * Rasterizes all multi-polygons into horizontal scanlines, packs the
   * result into a float buffer, and uploads it as an RGBA32F texture.
   *
   * @param multiPolygons - Polygon geometry for each shape in the object
   * @param objectBounds - Axis-aligned bounding box of all shapes
   */
  private _createScanlineDataTexture(
    multiPolygons: MultiPolygon[],
    objectBounds: Rect,
  ): WebGLTexture {
    const numValuesPerTextureLine =
      4 * WebGLShapesController._scanlineDataTextureWidth; // 4 values per RGBA32F texel
    const { scanlines, totalNumScanlineShapes, totalNumScanlineShapeEdges } =
      WebGLShapesController._createScanlines(
        this._numScanlines,
        multiPolygons,
        objectBounds,
      );
    const scanlineBuffer = WebGLShapesController._packScanlines(
      scanlines,
      totalNumScanlineShapes,
      totalNumScanlineShapeEdges,
      { paddingMultiple: numValuesPerTextureLine },
    );
    const scanlineData = new Float32Array(scanlineBuffer);
    const scanlineDataTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.RGBA32F,
      WebGLShapesController._scanlineDataTextureWidth,
      scanlineData.length / numValuesPerTextureLine,
      this._gl.RGBA,
      this._gl.FLOAT,
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
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<WebGLTexture> {
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
      colorData = new Uint32Array(ref.data.getLength()).fill(0);
    } else {
      const visibilityData = await LoadUtils.loadVisibilityData(
        ref.data.getIndex(),
        ref.shapes.shapeFillVisibility,
        visibilityMaps,
        defaultShapeFillVisibility,
        loadTable,
        { signal, padding: numValuesPerTextureLine },
      );
      signal?.throwIfAborted();
      const opacityData = await LoadUtils.loadOpacityData(
        ref.data.getIndex(),
        ref.shapes.shapeFillOpacity,
        opacityMaps,
        defaultShapeFillOpacity,
        loadTable,
        {
          signal,
          padding: numValuesPerTextureLine,
          opacityFactor: ref.layer.opacity * ref.shapes.opacity,
        },
      );
      signal?.throwIfAborted();
      colorData = await LoadUtils.loadColorData(
        ref.data.getIndex(),
        ref.shapes.shapeFillColor,
        colorMaps,
        defaultShapeFillColor,
        loadTable,
        { signal, padding: numValuesPerTextureLine },
        visibilityData,
        opacityData,
      );
      signal?.throwIfAborted();
    }
    const shapeFillColorsTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.R32UI,
      WebGLShapesController._shapeFillColorsTextureWidth,
      colorData.length / numValuesPerTextureLine,
      this._gl.RED_INTEGER,
      this._gl.UNSIGNED_INT,
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
    colorMaps: DefaultMap<Color>[],
    visibilityMaps: DefaultMap<boolean>[],
    opacityMaps: DefaultMap<number>[],
    loadTable: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<WebGLTexture> {
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
      colorData = new Uint32Array(ref.data.getLength()).fill(0);
    } else {
      const visibilityData = await LoadUtils.loadVisibilityData(
        ref.data.getIndex(),
        ref.shapes.shapeStrokeVisibility,
        visibilityMaps,
        defaultShapeStrokeVisibility,
        loadTable,
        { signal, padding: numValuesPerTextureLine },
      );
      signal?.throwIfAborted();
      const opacityData = await LoadUtils.loadOpacityData(
        ref.data.getIndex(),
        ref.shapes.shapeStrokeOpacity,
        opacityMaps,
        defaultShapeStrokeOpacity,
        loadTable,
        {
          signal,
          padding: numValuesPerTextureLine,
          opacityFactor: ref.layer.opacity * ref.shapes.opacity,
        },
      );
      signal?.throwIfAborted();
      colorData = await LoadUtils.loadColorData(
        ref.data.getIndex(),
        ref.shapes.shapeStrokeColor,
        colorMaps,
        defaultShapeStrokeColor,
        loadTable,
        { signal, padding: numValuesPerTextureLine },
        visibilityData,
        opacityData,
      );
      signal?.throwIfAborted();
    }
    const shapeStrokeColorsTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.R32UI,
      WebGLShapesController._shapeStrokeColorsTextureWidth,
      colorData.length / numValuesPerTextureLine,
      this._gl.RED_INTEGER,
      this._gl.UNSIGNED_INT,
      colorData,
    );
    return shapeStrokeColorsTexture;
  }

  /** Deletes all GPU textures owned by a single GLShapes entry */
  private _destroyGLShapes(glShapes: GLShapes): void {
    if (glShapes.scanlineDataTexture !== undefined) {
      this._gl.deleteTexture(glShapes.scanlineDataTexture);
    }
    this._gl.deleteTexture(glShapes.shapeFillColorsTexture);
    this._gl.deleteTexture(glShapes.shapeStrokeColorsTexture);
  }

  /**
   * Computes the axis-aligned bounding box of all multi-polygons
   *
   * @param multiPolygons - Polygon geometry
   * @returns The bounding rectangle in data-space coordinates
   */
  private static _getObjectBounds(multiPolygons: MultiPolygon[]): Rect {
    let xMin = Infinity,
      yMin = Infinity,
      xMax = -Infinity,
      yMax = -Infinity;
    for (const multiPolygon of multiPolygons) {
      for (const polygon of multiPolygon.polygons) {
        for (const path of [polygon.shell, ...polygon.holes]) {
          for (const vertex of path) {
            xMin = Math.min(xMin, vertex.x);
            yMin = Math.min(yMin, vertex.y);
            xMax = Math.max(xMax, vertex.x);
            yMax = Math.max(yMax, vertex.y);
          }
        }
      }
    }
    return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
  }

  /**
   * Rasterizes multi-polygons into horizontal scanlines
   *
   * For each scanline, determines which shapes and edges intersect it,
   * computes per-scanline/per-shape bounding boxes, and builds a 128-bit
   * occupancy mask for fast skip-testing in the fragment shader.
   *
   * @param numScanlines - Number of horizontal scanlines
   * @param multiPolygons - Polygon geometry for all shapes
   * @param objectBounds - Bounding box of all shapes
   * @returns Scanlines with per-shape edges, and total counts for buffer sizing
   */
  private static _createScanlines(
    numScanlines: number,
    multiPolygons: MultiPolygon[],
    objectBounds: Rect,
  ): {
    scanlines: Scanline[];
    totalNumScanlineShapes: number;
    totalNumScanlineShapeEdges: number;
  } {
    const scanlines: Scanline[] = Array.from({ length: numScanlines }, () => ({
      xMin: Infinity,
      xMax: -Infinity,
      shapes: new Map<number, ScanlineShape>(),
      occupancyMask: [0, 0, 0, 0],
    }));
    let totalNumScanlineShapes = 0;
    let totalNumScanlineShapeEdges = 0;
    for (let shapeIndex = 0; shapeIndex < multiPolygons.length; shapeIndex++) {
      for (const polygon of multiPolygons[shapeIndex]!.polygons) {
        // compute shape xMin/xMax/occupancy mask
        let xMin = Infinity,
          yMin = Infinity,
          xMax = -Infinity,
          yMax = -Infinity;
        for (const v of polygon.shell) {
          xMin = Math.min(xMin, v.x);
          yMin = Math.min(yMin, v.y);
          xMax = Math.max(xMax, v.x);
          yMax = Math.max(yMax, v.y);
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
        for (const path of [polygon.shell, ...polygon.holes]) {
          for (let i = 0; i < path.length; ++i) {
            const v0 = path[(i + 0) % path.length]!;
            const v1 = path[(i + 1) % path.length]!;
            if (v0.x === v1.x && v0.y === v1.y) {
              continue; // ignore zero-length edges
            }
            const firstEdgeScanlineIndex = MathUtils.clamp(
              Math.floor(
                (numScanlines * (Math.min(v0.y, v1.y) - objectBounds.y)) /
                  objectBounds.height,
              ),
              0,
              numScanlines - 1,
            );
            const lastEdgeScanlineIndex = MathUtils.clamp(
              Math.ceil(
                (numScanlines * (Math.max(v0.y, v1.y) - objectBounds.y)) /
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
              scanlineShape.edges.push({ v0, v1 });
              totalNumScanlineShapeEdges++;
            }
          }
        }
      }
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
   * @param options - Optional padding to align the buffer to texture line boundaries
   */
  private static _packScanlines(
    scanlines: Scanline[],
    totalNumScanlineShapes: number,
    totalNumScanlineShapeEdges: number,
    { paddingMultiple }: { paddingMultiple?: number } = {},
  ): ArrayBuffer {
    let dataLength =
      4 * scanlines.length + // header -> scanline info S
      4 * scanlines.length + // scanline S -> scanline header
      4 * totalNumScanlineShapes + // scanline S -> shape P -> shape header
      4 * totalNumScanlineShapeEdges; // scanline S -> shape P -> edge E
    if (paddingMultiple && dataLength % paddingMultiple !== 0) {
      dataLength += paddingMultiple - (dataLength % paddingMultiple);
    }
    const buffer = new ArrayBuffer(4 * dataLength); // 4 bytes per 32-bit value
    const float32Data = new Float32Array(buffer);
    const uint32Data = new Uint32Array(buffer);
    let currentScanlineTexelOffset = scanlines.length;
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
              scanlineShapeEdge.v0.x,
              scanlineShapeEdge.v0.y,
              scanlineShapeEdge.v1.x,
              scanlineShapeEdge.v1.y,
            ],
            4 * currentScanlineShapeEdgeTexelOffset,
          );
          currentScanlineShapeEdgeTexelOffset++;
        }
        currentScanlineShapeTexelOffset = currentScanlineShapeEdgeTexelOffset;
      }
      currentScanlineTexelOffset = currentScanlineShapeTexelOffset;
    }
    return buffer;
  }
}

/** Binding of a shapes data object to a specific layer and layer configuration */
type ShapesRef = {
  layer: Layer;
  shapes: Shapes;
  layerConfig: ShapesLayerConfig;
  layerConfigIndex: number;
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
  /** Number of shapes in the object at the time the textures were built */
  numShapes: number;
  /** Axis-aligned bounding box of all shapes in data-space coordinates */
  objectBounds: Rect;
  /** Scanline data texture (RGBA32F); `undefined` while being regenerated */
  scanlineDataTexture?: WebGLTexture;
  /** Per-shape fill color texture (R32UI) */
  shapeFillColorsTexture: WebGLTexture;
  /** Per-shape stroke color texture (R32UI) */
  shapeStrokeColorsTexture: WebGLTexture;
  /** Snapshot of model values at the time of the last texture upload */
  current: {
    layer: Pick<Layer, "visibility" | "opacity">;
    shapes: Pick<
      Shapes,
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
  /** First endpoint */
  v0: Vertex;
  /** Second endpoint */
  v1: Vertex;
};

/** A 128-bit occupancy mask stored as four 32-bit integers */
type ScanlineOccupancyMask = [number, number, number, number];
