import WebGLUtils from "../utils/WebGLUtils";
import WebGLPointsController from "./WebGLPointsController";
import WebGLShapesController from "./WebGLShapesController";

export default class WebGLManager {
  readonly canvas: HTMLCanvasElement;
  private _gl: WebGL2RenderingContext;
  private _pointsController: WebGLPointsController;
  private _shapesController: WebGLShapesController;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this._gl = WebGLManager._createWebGLContext(this.canvas);
    this._pointsController = new WebGLPointsController(this._gl);
    this._shapesController = new WebGLShapesController(this._gl);
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault(); // allow context to be restored
    });
    this.canvas.addEventListener("webglcontextrestored", () => {
      this._gl = WebGLManager._createWebGLContext(this.canvas);
      this._pointsController = new WebGLPointsController(this._gl);
      this._shapesController = new WebGLShapesController(this._gl);
    });
  }

  get pointsController(): WebGLPointsController {
    return this._pointsController;
  }

  get shapesController(): WebGLShapesController {
    return this._shapesController;
  }

  destroy(): void {
    this._pointsController.destroy();
    this._shapesController.destroy();
  }

  private static _createWebGLContext(
    canvas: HTMLCanvasElement,
  ): WebGL2RenderingContext {
    return WebGLUtils.init(canvas, {
      antialias: false,
      preserveDrawingBuffer: true,
    });
  }
}
