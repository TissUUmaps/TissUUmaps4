import shapesFragmentShader from "../../../assets/shaders/shapes.frag?raw";
import shapesVertexShader from "../../../assets/shaders/shapes.vert?raw";
import { ShapesData } from "../../../data/shapes";
import { TableData } from "../../../data/table";
import { CompleteLayer } from "../../../model/layer";
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
  private _glShapesStates: GLShapesState[] = [];
  private _numScanlines: number = 512; // default value should match DEFAULT_PROJECT_DRAW_OPTIONS.numShapesScanlines

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

  // TODO react to changes in numScanlines

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
    const glShapesStatesByRef = this._cleanGLShapes(refs);
    this._glShapesStates = await this._createOrUpdateGLShapes(
      refs,
      glShapesStatesByRef,
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
    for (const glShapesState of this._glShapesStates) {
      const worldToDataMatrix = WebGLShapesController.createWorldToDataMatrix(
        glShapesState.ref.layer,
        glShapesState.ref.layerConfig,
      );
      this._gl.uniformMatrix3x2fv(
        this._uniformLocations.worldToDataMatrix,
        false,
        TransformUtils.asGLMat3x2(worldToDataMatrix),
      );
      this._gl.uniform4f(
        this._uniformLocations.objectBounds,
        glShapesState.objectBounds.x,
        glShapesState.objectBounds.y,
        glShapesState.objectBounds.width,
        glShapesState.objectBounds.height,
      );
      this._gl.activeTexture(this._gl.TEXTURE1);
      this._gl.bindTexture(
        this._gl.TEXTURE_2D,
        glShapesState.scanlineDataTexture,
      );
      this._gl.activeTexture(this._gl.TEXTURE2);
      this._gl.bindTexture(
        this._gl.TEXTURE_2D,
        glShapesState.shapeFillColorsTexture,
      );
      this._gl.activeTexture(this._gl.TEXTURE3);
      this._gl.bindTexture(
        this._gl.TEXTURE_2D,
        glShapesState.shapeStrokeColorsTexture,
      );
      this._gl.drawArrays(this._gl.TRIANGLE_STRIP, 0, 4);
    }
    WebGLUtils.disableAlphaBlending(this._gl);
    this._gl.useProgram(null);
  }

  destroy(): void {
    this._gl.deleteProgram(this._program);
    for (const glShapesState of this._glShapesStates) {
      this._destroyGLShapesState(glShapesState);
    }
    this._glShapesStates = [];
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

  private _cleanGLShapes(refs: ShapesRef[]): Map<ShapesRef, GLShapesState> {
    const glShapesStatesByRef = new Map<ShapesRef, GLShapesState>();
    for (let i = 0; i < this._glShapesStates.length; i++) {
      const glShapesState = this._glShapesStates[i]!;
      const ref = refs.find(
        (ref) =>
          ref.layer.id === glShapesState.ref.layer.id &&
          ref.shapes.id === glShapesState.ref.shapes.id &&
          ref.rawLayerConfig === glShapesState.ref.rawLayerConfig,
      );
      if (ref !== undefined) {
        glShapesStatesByRef.set(ref, glShapesState);
      } else {
        const [glShapesState] = this._glShapesStates.splice(i, 1);
        this._destroyGLShapesState(glShapesState!);
        i--;
      }
    }
    return glShapesStatesByRef;
  }

  private async _createOrUpdateGLShapes(
    refs: ShapesRef[],
    glShapesStatesByRef: Map<ShapesRef, GLShapesState>,
    colorMaps: Map<string, ColorMap>,
    visibilityMaps: Map<string, ValueMap<boolean>>,
    opacityMaps: Map<string, ValueMap<number>>,
    loadTableByID: (
      tableId: string,
      options: { signal?: AbortSignal },
    ) => Promise<TableData>,
    options: { signal?: AbortSignal } = {},
  ): Promise<GLShapesState[]> {
    const { signal } = options;
    signal?.throwIfAborted();
    const glShapesStates = [];
    for (const ref of refs) {
      const numShapes = ref.data.getLength();
      const glShapesState = glShapesStatesByRef.get(ref);
      let objectBounds = glShapesState?.objectBounds;
      let scanlineDataTexture = glShapesState?.scanlineDataTexture;
      if (
        glShapesState === undefined ||
        objectBounds === undefined ||
        scanlineDataTexture === undefined ||
        glShapesState.numShapes !== numShapes
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
      let shapeFillColorsTexture = glShapesState?.shapeFillColorsTexture;
      if (
        glShapesState === undefined ||
        shapeFillColorsTexture === undefined ||
        glShapesState.current.layer.visibility !== ref.layer.visibility ||
        glShapesState.current.layer.opacity !== ref.layer.opacity ||
        glShapesState.current.shapes.visibility !== ref.shapes.visibility ||
        glShapesState.current.shapes.opacity !== ref.shapes.opacity ||
        glShapesState.current.shapes.shapeFillVisibility !==
          ref.shapes.shapeFillVisibility ||
        glShapesState.current.shapes.shapeFillVisibilityMap !==
          ref.shapes.shapeFillVisibilityMap ||
        glShapesState.current.shapes.shapeFillOpacity !==
          ref.shapes.shapeFillOpacity ||
        glShapesState.current.shapes.shapeFillOpacityMap !==
          ref.shapes.shapeFillOpacityMap ||
        glShapesState.current.shapes.shapeFillColor !==
          ref.shapes.shapeFillColor ||
        glShapesState.current.shapes.shapeFillColorRange !==
          ref.shapes.shapeFillColorRange ||
        glShapesState.current.shapes.shapeFillColorPalette !==
          ref.shapes.shapeFillColorPalette ||
        glShapesState.current.shapes.shapeFillColorMap !==
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
      let shapeStrokeColorsTexture = glShapesState?.shapeStrokeColorsTexture;
      if (
        glShapesState === undefined ||
        shapeStrokeColorsTexture === undefined ||
        glShapesState.current.layer.visibility !== ref.layer.visibility ||
        glShapesState.current.layer.opacity !== ref.layer.opacity ||
        glShapesState.current.shapes.visibility !== ref.shapes.visibility ||
        glShapesState.current.shapes.opacity !== ref.shapes.opacity ||
        glShapesState.current.shapes.shapeStrokeVisibility !==
          ref.shapes.shapeStrokeVisibility ||
        glShapesState.current.shapes.shapeStrokeVisibilityMap !==
          ref.shapes.shapeStrokeVisibilityMap ||
        glShapesState.current.shapes.shapeStrokeOpacity !==
          ref.shapes.shapeStrokeOpacity ||
        glShapesState.current.shapes.shapeStrokeOpacityMap !==
          ref.shapes.shapeStrokeOpacityMap ||
        glShapesState.current.shapes.shapeStrokeColor !==
          ref.shapes.shapeStrokeColor ||
        glShapesState.current.shapes.shapeStrokeColorRange !==
          ref.shapes.shapeStrokeColorRange ||
        glShapesState.current.shapes.shapeStrokeColorPalette !==
          ref.shapes.shapeStrokeColorPalette ||
        glShapesState.current.shapes.shapeStrokeColorMap !==
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
      glShapesStates.push({
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
    return glShapesStates;
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
    );
    const scanlineDataTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.RGBA32F,
      WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH,
      Math.ceil(
        scanlineData.length /
          (4 * WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH),
      ),
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
        { signal },
      );
      signal?.throwIfAborted();
      const opacityData = await LoadUtils.loadOpacityData(
        numShapes,
        ref.shapes.shapeFillOpacity,
        ref.shapes.shapeFillOpacityMap,
        DEFAULT_SHAPE_FILL_OPACITY,
        opacityMaps,
        loadTableByID,
        { signal, opacityFactor: ref.layer.opacity * ref.shapes.opacity },
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
        { signal },
      );
      signal?.throwIfAborted();
    }
    const shapeFillColorsTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.R32UI,
      WebGLShapesController._SHAPE_FILL_COLORS_TEXTURE_WIDTH,
      Math.ceil(
        colorData.length / WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH,
      ),
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
        { signal },
      );
      signal?.throwIfAborted();
      const opacityData = await LoadUtils.loadOpacityData(
        numShapes,
        ref.shapes.shapeStrokeOpacity,
        ref.shapes.shapeStrokeOpacityMap,
        DEFAULT_SHAPE_STROKE_OPACITY,
        opacityMaps,
        loadTableByID,
        { signal, opacityFactor: ref.layer.opacity * ref.shapes.opacity },
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
        { signal },
      );
      signal?.throwIfAborted();
    }
    const shapeStrokeColorsTexture = WebGLUtils.createDataTexture(
      this._gl,
      this._gl.R32UI,
      WebGLShapesController._SHAPE_STROKE_COLORS_TEXTURE_WIDTH,
      Math.ceil(
        colorData.length / WebGLShapesController._SCANLINE_DATA_TEXTURE_WIDTH,
      ),
      this._gl.RED_INTEGER,
      this._gl.UNSIGNED_INT,
      colorData,
    );
    return shapeStrokeColorsTexture;
  }

  private _destroyGLShapesState(glShapesState: GLShapesState): void {
    this._gl.deleteTexture(glShapesState.scanlineDataTexture);
    this._gl.deleteTexture(glShapesState.shapeFillColorsTexture);
    this._gl.deleteTexture(glShapesState.shapeStrokeColorsTexture);
  }
}

type ShapesRef = {
  layer: CompleteLayer;
  shapes: CompleteShapes;
  rawLayerConfig: ShapesLayerConfig;
  layerConfig: CompleteShapesLayerConfig;
  data: ShapesData;
};

type GLShapesState = {
  ref: ShapesRef;
  numShapes: number;
  objectBounds: Rect;
  scanlineDataTexture: WebGLTexture;
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
