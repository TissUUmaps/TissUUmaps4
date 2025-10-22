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
} from "../../../types";
import LoadUtils from "../../../utils/LoadUtils";
import ShapeUtils from "../../../utils/ShapeUtils";
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
        objectBounds = ShapeUtils.getBounds(multiPolygons);
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
    const { scanlines, numScanlineShapes, numScanlineShapeEdges } =
      ShapeUtils.createScanlines(
        this._numScanlines,
        multiPolygons,
        objectBounds,
      );
    const scanlineData = ShapeUtils.packScanlines(
      scanlines,
      numScanlineShapes,
      numScanlineShapeEdges,
      { padToWidth: 4 * WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH },
    );
    const scanlineDataTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.RGBA32F,
      WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH,
      scanlineData.length /
        (4 * WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH),
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
        {
          signal,
          padToWidth: WebGLShapesController._SHAPE_FILL_COLORS_TEXTURE_WIDTH,
        },
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
          padToWidth: WebGLShapesController._SHAPE_FILL_COLORS_TEXTURE_WIDTH,
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
        {
          signal,
          padToWidth: WebGLShapesController._SHAPE_FILL_COLORS_TEXTURE_WIDTH,
        },
      );
      signal?.throwIfAborted();
    }
    const shapeFillColorsTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.R32UI,
      WebGLShapesController._SHAPE_FILL_COLORS_TEXTURE_WIDTH,
      colorData.length / WebGLShapesController._SHAPE_FILL_COLORS_TEXTURE_WIDTH,
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
    let colorData;
    if (
      ref.layer.visibility === false ||
      ref.layer.opacity === 0 ||
      ref.shapes.visibility === false ||
      ref.shapes.opacity === 0
    ) {
      colorData = new Uint32Array(ref.data.getLength()).fill(0);
    } else {
      const numShapes = ref.data.getLength();
      const visibilityData = await LoadUtils.loadVisibilityData(
        numShapes,
        ref.shapes.shapeStrokeVisibility,
        ref.shapes.shapeStrokeVisibilityMap,
        DEFAULT_SHAPE_STROKE_VISIBILITY,
        visibilityMaps,
        loadTableByID,
        {
          signal,
          padToWidth: WebGLShapesController._SHAPE_STROKE_COLORS_TEXTURE_WIDTH,
        },
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
          padToWidth: WebGLShapesController._SHAPE_STROKE_COLORS_TEXTURE_WIDTH,
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
        {
          signal,
          padToWidth: WebGLShapesController._SHAPE_STROKE_COLORS_TEXTURE_WIDTH,
        },
      );
      signal?.throwIfAborted();
    }
    const shapeStrokeColorsTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.R32UI,
      WebGLShapesController._SHAPE_STROKE_COLORS_TEXTURE_WIDTH,
      colorData.length /
        WebGLShapesController._SHAPE_STROKE_COLORS_TEXTURE_WIDTH,
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
