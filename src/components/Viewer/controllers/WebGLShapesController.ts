import shapesFragmentShader from "../../../assets/shaders/shapes.frag?raw";
import shapesVertexShader from "../../../assets/shaders/shapes.vert?raw";
import { ShapesData } from "../../../data/shapes";
import { TableData } from "../../../data/table";
import { CompleteLayer } from "../../../model/layer";
import { DEFAULT_PROJECT_DRAW_OPTIONS } from "../../../model/project";
import {
  CompleteShapes,
  CompleteShapesLayerConfig,
  DEFAULT_SHAPE_FILL_COLOR,
  DEFAULT_SHAPE_FILL_OPACITY,
  DEFAULT_SHAPE_FILL_VISIBILITY,
  DEFAULT_SHAPE_STROKE_COLOR,
  DEFAULT_SHAPE_STROKE_OPACITY,
  DEFAULT_SHAPE_STROKE_VISIBILITY,
  ShapesLayerConfig,
  completeShapesLayerConfig,
} from "../../../model/shapes";
import {
  ColorMap,
  DrawOptions,
  MultiPolygon,
  Rect,
  ValueMap,
  Vertex,
} from "../../../types";
import LoadUtils from "../../../utils/LoadUtils";
import MathUtils from "../../../utils/MathUtils";
import TransformUtils from "../../../utils/TransformUtils";
import WebGLUtils from "../../../utils/WebGLUtils";
import WebGLControllerBase from "./WebGLControllerBase";

export default class WebGLShapesController extends WebGLControllerBase {
  private static readonly _SCANLINE_DATA_TEXTURE_WIDTH = 4096; // see fragment shader
  private static readonly _SHAPE_FILL_COLORS_TEXTURE_WIDTH = 4096; // see fragment shader
  private static readonly _SHAPE_STROKE_COLORS_TEXTURE_WIDTH = 4096; // see fragment shader

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
  private _numScanlines: number =
    DEFAULT_PROJECT_DRAW_OPTIONS.numShapesScanlines;
  private _glShapes: GLShapes[] = [];

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

  setNumScanlines(numScanlines: number): boolean {
    let sync = false;
    if (numScanlines !== this._numScanlines) {
      // invalidate scanline data textures
      this._glShapes.forEach((glShapes) => {
        if (glShapes.scanlineDataTexture !== undefined) {
          this._gl.deleteTexture(glShapes.scanlineDataTexture);
        }
        glShapes.scanlineDataTexture = undefined;
      });
      sync = true;
    }
    this._numScanlines = numScanlines;
    return sync;
  }

  async synchronize(
    layerMap: Map<string, CompleteLayer>,
    shapesMap: Map<string, CompleteShapes>,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    loadShapes: (
      shapes: CompleteShapes,
      options: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: { signal?: AbortSignal } = {},
  ): Promise<void> {
    const { signal } = options;
    signal?.throwIfAborted();
    const refs = await this._loadShapes(layerMap, shapesMap, loadShapes, {
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
      loadTableByID,
      { signal },
    );
    signal?.throwIfAborted();
  }

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

  destroy(): void {
    this._gl.deleteProgram(this._program);
    for (const glShapes of this._glShapes) {
      this._destroyGLShapes(glShapes);
    }
    this._glShapes = [];
  }

  private async _loadShapes(
    layerMap: Map<string, CompleteLayer>,
    shapesMap: Map<string, CompleteShapes>,
    loadShapes: (
      shapes: CompleteShapes,
      options: { signal?: AbortSignal },
    ) => Promise<ShapesData>,
    options: { signal?: AbortSignal } = {},
  ): Promise<ShapesRef[]> {
    const { signal } = options;
    signal?.throwIfAborted();
    const refs: ShapesRef[] = [];
    for (const layer of layerMap.values()) {
      for (const shapes of shapesMap.values()) {
        for (const rawLayerConfig of shapes.layerConfigs.filter(
          (rawLayerConfig) => rawLayerConfig.layerId === layer.id,
        )) {
          let data;
          try {
            data = await loadShapes(shapes, { signal });
          } catch (error) {
            console.error(
              `Failed to load shapes with ID '${shapes.id}'`,
              error,
            );
          }
          signal?.throwIfAborted();
          if (data !== undefined) {
            refs.push({
              layer: layer,
              shapes: shapes,
              rawLayerConfig: rawLayerConfig,
              layerConfig: completeShapesLayerConfig(rawLayerConfig),
              data: data,
            });
          }
        }
      }
    }
    return refs;
  }

  private _cleanGLShapes(refs: ShapesRef[]): Map<ShapesRef, GLShapes> {
    const glShapesByRef = new Map<ShapesRef, GLShapes>();
    for (let i = 0; i < this._glShapes.length; i++) {
      const glShapes = this._glShapes[i]!;
      const ref = refs.find(
        (ref) =>
          ref.layer.id === glShapes.ref.layer.id &&
          ref.shapes.id === glShapes.ref.shapes.id &&
          ref.rawLayerConfig === glShapes.ref.rawLayerConfig,
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

  private async _createOrUpdateGLShapes(
    refs: ShapesRef[],
    glShapesByRef: Map<ShapesRef, GLShapes>,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: { signal?: AbortSignal } = {},
  ): Promise<GLShapes[]> {
    const { signal } = options;
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
        glShapes.current.shapes.shapeFillVisibility !==
          ref.shapes.shapeFillVisibility ||
        glShapes.current.shapes.shapeFillVisibilityMap !==
          ref.shapes.shapeFillVisibilityMap ||
        glShapes.current.shapes.shapeFillOpacity !==
          ref.shapes.shapeFillOpacity ||
        glShapes.current.shapes.shapeFillOpacityMap !==
          ref.shapes.shapeFillOpacityMap ||
        glShapes.current.shapes.shapeFillColor !== ref.shapes.shapeFillColor ||
        glShapes.current.shapes.shapeFillColorRange !==
          ref.shapes.shapeFillColorRange ||
        glShapes.current.shapes.shapeFillColorPalette !==
          ref.shapes.shapeFillColorPalette ||
        glShapes.current.shapes.shapeFillColorMap !==
          ref.shapes.shapeFillColorMap
      ) {
        shapeFillColorsTexture = await this._createShapeFillColorsTexture(
          ref,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTableByID,
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
        glShapes.current.shapes.shapeStrokeVisibility !==
          ref.shapes.shapeStrokeVisibility ||
        glShapes.current.shapes.shapeStrokeVisibilityMap !==
          ref.shapes.shapeStrokeVisibilityMap ||
        glShapes.current.shapes.shapeStrokeOpacity !==
          ref.shapes.shapeStrokeOpacity ||
        glShapes.current.shapes.shapeStrokeOpacityMap !==
          ref.shapes.shapeStrokeOpacityMap ||
        glShapes.current.shapes.shapeStrokeColor !==
          ref.shapes.shapeStrokeColor ||
        glShapes.current.shapes.shapeStrokeColorRange !==
          ref.shapes.shapeStrokeColorRange ||
        glShapes.current.shapes.shapeStrokeColorPalette !==
          ref.shapes.shapeStrokeColorPalette ||
        glShapes.current.shapes.shapeStrokeColorMap !==
          ref.shapes.shapeStrokeColorMap
      ) {
        shapeStrokeColorsTexture = await this._createShapeStrokeColorsTexture(
          ref,
          colorMaps,
          visibilityMaps,
          opacityMaps,
          loadTableByID,
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
            shapeFillColor: ref.shapes.shapeFillColor,
            shapeFillColorRange: ref.shapes.shapeFillColorRange,
            shapeFillColorPalette: ref.shapes.shapeFillColorPalette,
            shapeFillColorMap: ref.shapes.shapeFillColorMap,
            shapeFillVisibility: ref.shapes.shapeFillVisibility,
            shapeFillVisibilityMap: ref.shapes.shapeFillVisibilityMap,
            shapeFillOpacity: ref.shapes.shapeFillOpacity,
            shapeFillOpacityMap: ref.shapes.shapeFillOpacityMap,
            shapeStrokeColor: ref.shapes.shapeStrokeColor,
            shapeStrokeColorRange: ref.shapes.shapeStrokeColorRange,
            shapeStrokeColorPalette: ref.shapes.shapeStrokeColorPalette,
            shapeStrokeColorMap: ref.shapes.shapeStrokeColorMap,
            shapeStrokeVisibility: ref.shapes.shapeStrokeVisibility,
            shapeStrokeVisibilityMap: ref.shapes.shapeStrokeVisibilityMap,
            shapeStrokeOpacity: ref.shapes.shapeStrokeOpacity,
            shapeStrokeOpacityMap: ref.shapes.shapeStrokeOpacityMap,
          },
        },
      });
    }
    return newGLShapes;
  }

  private _createScanlineDataTexture(
    multiPolygons: MultiPolygon[],
    objectBounds: Rect,
  ): WebGLTexture {
    const numValuesPerTextureLine =
      4 * WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH; // 4 values per RGBA32F texel
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
      WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH,
      scanlineData.length / numValuesPerTextureLine,
      this._gl.RGBA,
      this._gl.FLOAT,
      scanlineData,
    );
    return scanlineDataTexture;
  }

  private async _createShapeFillColorsTexture(
    ref: ShapesRef,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: { signal?: AbortSignal } = {},
  ): Promise<WebGLTexture> {
    const { signal } = options;
    signal?.throwIfAborted();
    const numShapes = ref.data.getLength();
    const numValuesPerTextureLine =
      1 * WebGLShapesController._SHAPE_FILL_COLORS_TEXTURE_WIDTH; // 1 value per R32UI texel
    let colorData;
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.shapes.visibility === false ||
      ref.shapes.opacity === 0
    ) {
      colorData = new Uint32Array(numShapes).fill(0);
    } else {
      const visibilityData = await LoadUtils.loadVisibilityData(
        numShapes,
        ref.shapes.shapeFillVisibility,
        ref.shapes.shapeFillVisibilityMap,
        DEFAULT_SHAPE_FILL_VISIBILITY,
        visibilityMaps,
        loadTableByID,
        { signal, paddingMultiple: numValuesPerTextureLine },
      );
      signal?.throwIfAborted();
      const opacityData = await LoadUtils.loadOpacityData(
        numShapes,
        ref.shapes.shapeFillOpacity,
        ref.shapes.shapeFillOpacityMap,
        DEFAULT_SHAPE_FILL_OPACITY,
        opacityMaps,
        loadTableByID,
        {
          signal,
          paddingMultiple: numValuesPerTextureLine,
          opacityFactor: ref.layer.opacity * ref.shapes.opacity,
        },
      );
      signal?.throwIfAborted();
      colorData = await LoadUtils.loadColorData(
        numShapes,
        ref.shapes.shapeFillColor,
        ref.shapes.shapeFillColorRange,
        ref.shapes.shapeFillColorPalette,
        ref.shapes.shapeFillColorMap,
        DEFAULT_SHAPE_FILL_COLOR,
        visibilityData,
        opacityData,
        colorMaps,
        loadTableByID,
        { signal, paddingMultiple: numValuesPerTextureLine },
      );
      signal?.throwIfAborted();
    }
    const shapeFillColorsTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.R32UI,
      WebGLShapesController._SHAPE_FILL_COLORS_TEXTURE_WIDTH,
      colorData.length / numValuesPerTextureLine,
      this._gl.RED_INTEGER,
      this._gl.UNSIGNED_INT,
      colorData,
    );
    return shapeFillColorsTexture;
  }

  private async _createShapeStrokeColorsTexture(
    ref: ShapesRef,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: { signal?: AbortSignal } = {},
  ): Promise<WebGLTexture> {
    const { signal } = options;
    signal?.throwIfAborted();
    const numShapes = ref.data.getLength();
    const numValuesPerTextureLine =
      1 * WebGLShapesController._SHAPE_STROKE_COLORS_TEXTURE_WIDTH; // 1 value per R32UI texel
    let colorData;
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.shapes.visibility === false ||
      ref.shapes.opacity === 0
    ) {
      colorData = new Uint32Array(numShapes).fill(0);
    } else {
      const visibilityData = await LoadUtils.loadVisibilityData(
        numShapes,
        ref.shapes.shapeStrokeVisibility,
        ref.shapes.shapeStrokeVisibilityMap,
        DEFAULT_SHAPE_STROKE_VISIBILITY,
        visibilityMaps,
        loadTableByID,
        { signal, paddingMultiple: numValuesPerTextureLine },
      );
      signal?.throwIfAborted();
      const opacityData = await LoadUtils.loadOpacityData(
        numShapes,
        ref.shapes.shapeStrokeOpacity,
        ref.shapes.shapeStrokeOpacityMap,
        DEFAULT_SHAPE_STROKE_OPACITY,
        opacityMaps,
        loadTableByID,
        {
          signal,
          paddingMultiple: numValuesPerTextureLine,
          opacityFactor: ref.layer.opacity * ref.shapes.opacity,
        },
      );
      signal?.throwIfAborted();
      colorData = await LoadUtils.loadColorData(
        numShapes,
        ref.shapes.shapeStrokeColor,
        ref.shapes.shapeStrokeColorRange,
        ref.shapes.shapeStrokeColorPalette,
        ref.shapes.shapeStrokeColorMap,
        DEFAULT_SHAPE_STROKE_COLOR,
        visibilityData,
        opacityData,
        colorMaps,
        loadTableByID,
        { signal, paddingMultiple: numValuesPerTextureLine },
      );
      signal?.throwIfAborted();
    }
    const shapeStrokeColorsTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.R32UI,
      WebGLShapesController._SHAPE_STROKE_COLORS_TEXTURE_WIDTH,
      colorData.length / numValuesPerTextureLine,
      this._gl.RED_INTEGER,
      this._gl.UNSIGNED_INT,
      colorData,
    );
    return shapeStrokeColorsTexture;
  }

  private _destroyGLShapes(glShapes: GLShapes): void {
    if (glShapes.scanlineDataTexture !== undefined) {
      this._gl.deleteTexture(glShapes.scanlineDataTexture);
    }
    this._gl.deleteTexture(glShapes.shapeFillColorsTexture);
    this._gl.deleteTexture(glShapes.shapeStrokeColorsTexture);
  }

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

  private static _packScanlines(
    scanlines: Scanline[],
    totalNumScanlineShapes: number,
    totalNumScanlineShapeEdges: number,
    options: { paddingMultiple?: number } = {},
  ): ArrayBuffer {
    const { paddingMultiple } = options;
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

type ShapesRef = {
  layer: CompleteLayer;
  shapes: CompleteShapes;
  rawLayerConfig: ShapesLayerConfig;
  layerConfig: CompleteShapesLayerConfig;
  data: ShapesData;
};

type GLShapes = {
  ref: ShapesRef;
  numShapes: number;
  objectBounds: Rect;
  scanlineDataTexture?: WebGLTexture;
  shapeFillColorsTexture: WebGLTexture;
  shapeStrokeColorsTexture: WebGLTexture;
  current: {
    layer: Pick<CompleteLayer, "visibility" | "opacity">;
    shapes: Pick<
      CompleteShapes,
      | "visibility"
      | "opacity"
      | "shapeFillColor"
      | "shapeFillColorRange"
      | "shapeFillColorPalette"
      | "shapeFillColorMap"
      | "shapeFillVisibility"
      | "shapeFillVisibilityMap"
      | "shapeFillOpacity"
      | "shapeFillOpacityMap"
      | "shapeStrokeColor"
      | "shapeStrokeColorRange"
      | "shapeStrokeColorPalette"
      | "shapeStrokeColorMap"
      | "shapeStrokeVisibility"
      | "shapeStrokeVisibilityMap"
      | "shapeStrokeOpacity"
      | "shapeStrokeOpacityMap"
    >;
  };
};

type Scanline = {
  xMin: number;
  xMax: number;
  shapes: Map<number, ScanlineShape>;
  occupancyMask: ScanlineOccupancyMask;
};

type ScanlineShape = {
  xMin: number;
  xMax: number;
  edges: ScanlineShapeEdge[];
};

type ScanlineShapeEdge = {
  v0: Vertex;
  v1: Vertex;
};

type ScanlineOccupancyMask = [number, number, number, number];
