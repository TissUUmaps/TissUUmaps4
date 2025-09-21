import { BlendMode } from "../models/types";
import WebGLUtils from "../utils/WebGLUtils";
import WebGLPointsController from "./WebGLPointsController";
import WebGLShapesController from "./WebGLShapesController";

export type Viewport = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export default class WebGLController {
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#maximum_canvas_size
  private static readonly _MAX_CANVAS_SIZE = 4096;

  private readonly _canvas: HTMLCanvasElement;
  private _gl: WebGL2RenderingContext;
  private _pointsController: WebGLPointsController;
  private _shapesController: WebGLShapesController;
  private _blendMode: BlendMode = "over";

  static createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.style =
      "position: relative; width: 100%; height: 100%; z-index: 50;";
    return canvas;
  }

  constructor(canvas: HTMLCanvasElement) {
    this._canvas = canvas;
    this._gl = WebGLController._createWebGLContext(this._canvas);
    this._pointsController = new WebGLPointsController(this._gl);
    this._shapesController = new WebGLShapesController(this._gl);
    this._canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault(); // allow context to be restored
    });
    this._canvas.addEventListener("webglcontextrestored", () => {
      this._gl = WebGLController._createWebGLContext(this._canvas);
      this._pointsController = new WebGLPointsController(this._gl);
      this._shapesController = new WebGLShapesController(this._gl);
    });
  }

  set blendMode(mode: BlendMode) {
    this._blendMode = mode;
  }

  async synchronizePoints(
    ...args: Parameters<typeof this._pointsController.synchronize>
  ): ReturnType<typeof this._pointsController.synchronize> {
    return await this._pointsController.synchronize(...args);
  }

  async synchronizeShapes(
    ...args: Parameters<typeof this._shapesController.synchronize>
  ): ReturnType<typeof this._shapesController.synchronize> {
    return await this._shapesController.synchronize(...args);
  }

  draw(viewport: Viewport): void {
    this._gl.clearColor(0, 0, 0, 0);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    this._pointsController.draw(viewport, this._blendMode);
    this._shapesController.draw(viewport, this._blendMode);
  }

  resize(width: number, height: number): void {
    width *= window.devicePixelRatio;
    height *= window.devicePixelRatio;
    const maxSize = Math.max(width, height);
    if (maxSize > WebGLController._MAX_CANVAS_SIZE) {
      const scale = WebGLController._MAX_CANVAS_SIZE / maxSize;
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
    this._canvas.width = width;
    this._canvas.height = height;
    this._gl.viewport(0, 0, width, height);
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
