import { projectDefaults } from "../model";
import { type DrawOptions, type Rect } from "../types";
import { WebGLUtils } from "../utils";
import { WebGLPointsController } from "./WebGLPointsController";
import { WebGLShapesController } from "./WebGLShapesController";

export class WebGLController {
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#maximum_canvas_size
  private static readonly _maxCanvasSize = 4096;
  private static readonly _defaultDrawOptions = projectDefaults.drawOptions;

  private readonly _canvas: HTMLCanvasElement;
  private _viewport: Rect;
  private _drawOptions: DrawOptions;
  private _gl: WebGL2RenderingContext;
  private _pointsController: WebGLPointsController;
  private _shapesController: WebGLShapesController;

  static createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.style.setProperty("position", "relative");
    canvas.style.setProperty("width", "100%");
    canvas.style.setProperty("height", "100%");
    canvas.style.setProperty("z-index", "50");
    return canvas;
  }

  constructor(canvas: HTMLCanvasElement, viewport: Rect) {
    this._canvas = canvas;
    this._viewport = viewport;
    this._drawOptions = WebGLController._defaultDrawOptions;
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

  setViewport(viewport: Rect): boolean {
    if (
      this._viewport.x !== viewport.x ||
      this._viewport.y !== viewport.y ||
      this._viewport.width !== viewport.width ||
      this._viewport.height !== viewport.height
    ) {
      this._viewport = viewport;
      return true;
    }
    return false;
  }

  setDrawOptions(drawOptions: DrawOptions): {
    syncPoints: boolean;
    syncShapes: boolean;
  } {
    this._drawOptions = drawOptions;
    const syncShapes = this._shapesController.setNumScanlines(
      drawOptions.numShapesScanlines,
    );
    return { syncPoints: false, syncShapes };
  }

  async initialize({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<WebGLController> {
    signal?.throwIfAborted();
    await this._pointsController.initialize({ signal });
    signal?.throwIfAborted();
    return this;
  }

  async synchronizePoints(
    ...args: Parameters<typeof WebGLPointsController.prototype.synchronize>
  ): ReturnType<typeof WebGLPointsController.prototype.synchronize> {
    return await this._pointsController.synchronize(...args);
  }

  async synchronizeShapes(
    ...args: Parameters<typeof WebGLShapesController.prototype.synchronize>
  ): ReturnType<typeof WebGLShapesController.prototype.synchronize> {
    return await this._shapesController.synchronize(...args);
  }

  resizeCanvas(size: { width: number; height: number }): boolean {
    let { width, height } = size;
    width *= window.devicePixelRatio;
    height *= window.devicePixelRatio;
    if (width <= 0 || height <= 0) {
      width = 1;
      height = 1;
    } else if (
      width > WebGLController._maxCanvasSize ||
      height > WebGLController._maxCanvasSize
    ) {
      const scale = WebGLController._maxCanvasSize / Math.max(width, height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
    if (this._canvas.width !== width && this._canvas.height !== height) {
      this._canvas.width = width;
      this._canvas.height = height;
      this._gl.viewport(0, 0, width, height);
      return true;
    }
    return false;
  }

  draw(): void {
    this._gl.clearColor(0, 0, 0, 0);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    this._pointsController.draw(this._viewport, this._drawOptions);
    this._shapesController.draw(this._viewport, this._drawOptions);
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
