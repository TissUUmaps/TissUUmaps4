import shapesFragmentShader from "../../../assets/shaders/shapes.frag?raw";
import shapesVertexShader from "../../../assets/shaders/shapes.vert?raw";
import { ShapesData } from "../../../data/shapes";
import { TableData } from "../../../data/table";
import { CompleteLayer } from "../../../model/layer";
import {
  CompleteShapes,
  CompleteShapesLayerConfig,
  ShapesLayerConfig,
} from "../../../model/shapes";
import { DrawOptions, Rect } from "../../../types";
import TransformUtils from "../../../utils/TransformUtils";
import WebGLUtils from "../../../utils/WebGLUtils";
import WebGLControllerBase from "./WebGLControllerBase";

export default class WebGLShapesController extends WebGLControllerBase {
  private readonly _program: WebGLProgram;
  private readonly _uniformLocations: {
    viewportToWorldMatrix: WebGLUniformLocation;
    worldToDataMatrix: WebGLUniformLocation;
    strokeWidth: WebGLUniformLocation;
    numScanlines: WebGLUniformLocation;
    objectBounds: WebGLUniformLocation;
    scanlineData: WebGLUniformLocation;
    shapeData: WebGLUniformLocation;
  };
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
      shapeData: WebGLUtils.getUniformLocation(
        this._gl,
        this._program,
        "u_shapeData",
      ),
    };
  }

  async synchronize(
    layerMap: Map<string, CompleteLayer>,
    shapesMap: Map<string, CompleteShapes>,
    loadShapes: (
      shapes: CompleteShapes,
      signal?: AbortSignal,
    ) => Promise<ShapesData>,
    loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    const refs: ShapesRef[] = await this._collectShapes(
      layerMap,
      shapesMap,
      loadShapes,
      signal,
    );
    signal?.throwIfAborted();
    // cleanup removed shapes
    const refGLShapes = new Map<ShapesRef, GLShapes>();
    for (let i = 0; i < this._glShapes.length; i++) {
      const glShapes = this._glShapes[i]!;
      const ref = refs.find(
        (ref) =>
          ref.layer.id === glShapes.ref.layer.id &&
          ref.shapes.id === glShapes.ref.shapes.id &&
          ref.rawLayerConfig === glShapes.ref.rawLayerConfig,
      );
      if (ref !== undefined) {
        refGLShapes.set(ref, glShapes);
      } else {
        this._glShapes.splice(i, 1);
        i--;
      }
    }
    // create or update GL shapes
    const newGLShapes: GLShapes[] = [];
    for (const ref of refs) {
      let glShapes = refGLShapes.get(ref);
      if (
        glShapes === undefined ||
        glShapes.ref.layer.id !== ref.layer.id ||
        glShapes.ref.shapes.id !== ref.shapes.id ||
        glShapes.ref.rawLayerConfig !== ref.rawLayerConfig
      ) {
        glShapes = await this._createGLShapes(ref, loadTableByID, signal);
        signal?.throwIfAborted();
      } else {
        await this._updateGLShapes(glShapes, ref, loadTableByID, signal);
        signal?.throwIfAborted();
      }
      newGLShapes.push(glShapes);
    }
    this._glShapes = newGLShapes;
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
      drawOptions.numShapesScanlines,
    );
    this._gl.uniform1f(
      this._uniformLocations.strokeWidth,
      drawOptions.shapeStrokeWidth,
    );
    this._gl.uniform1i(this._uniformLocations.scanlineData, 1);
    this._gl.uniform1i(this._uniformLocations.shapeData, 2);
    WebGLUtils.enableAlphaBlending(this._gl);
    for (const glShapes of this._glShapes) {
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
      this._gl.bindTexture(this._gl.TEXTURE_2D, glShapes.shapeDataTexture);
      this._gl.drawArrays(this._gl.TRIANGLE_STRIP, 0, 4);
    }
    WebGLUtils.disableAlphaBlending(this._gl);
    this._gl.useProgram(null);
  }

  destroy(): void {
    this._gl.deleteProgram(this._program);
    for (const glShapes of this._glShapes) {
      this._gl.deleteTexture(glShapes.scanlineDataTexture);
      this._gl.deleteTexture(glShapes.shapeDataTexture);
    }
  }

  private _collectShapes(
    _layerMap: Map<string, CompleteLayer>,
    _shapesMap: Map<string, CompleteShapes>,
    _loadShapes: (
      shapes: CompleteShapes,
      signal?: AbortSignal,
    ) => Promise<ShapesData>,
    signal?: AbortSignal,
  ): Promise<ShapesRef[]> {
    signal?.throwIfAborted();
    // TODO implement shapes collection
    throw new Error("Method not implemented.");
  }

  private _createGLShapes(
    _ref: ShapesRef,
    _loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<GLShapes> {
    signal?.throwIfAborted();
    // TODO implement GL shapes creation
    throw new Error("Method not implemented.");
  }

  private _updateGLShapes(
    _glShapes: GLShapes,
    _ref: ShapesRef,
    _loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    // TODO implement GL shapes update
    throw new Error("Method not implemented.");
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
  objectBounds: Rect;
  scanlineDataTexture: WebGLTexture;
  shapeDataTexture: WebGLTexture;
};
