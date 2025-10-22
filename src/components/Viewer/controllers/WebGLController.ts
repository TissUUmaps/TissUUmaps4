import { DrawOptions, Rect } from "../../../types";
import WebGLUtils from "../../../utils/WebGLUtils";
import WebGLPointsController from "./WebGLPointsController";
import WebGLShapesController from "./WebGLShapesController";

export default class WebGLController {
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#maximum_canvas_size
  static readonly MAX_CANVAS_SIZE = 4096;
  static readonly DEFAULT_DRAW_OPTIONS: DrawOptions = {
    pointSizeFactor: 1,
    shapeStrokeWidth: 1,
    numShapesScanlines: 512,
  };

  private readonly _canvas: HTMLCanvasElement;
  private _gl: WebGL2RenderingContext;
  private _pointsController: WebGLPointsController;
  private _shapesController: WebGLShapesController;
  private _drawOptions: DrawOptions = WebGLController.DEFAULT_DRAW_OPTIONS;

  static createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.style.setProperty("position", "relative");
    canvas.style.setProperty("width", "100%");
    canvas.style.setProperty("height", "100%");
    canvas.style.setProperty("z-index", "50");
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

  setDrawOptions(drawOptions: DrawOptions): void {
    this._drawOptions = drawOptions;
  }

  async initialize(
    options: { signal?: AbortSignal } = {},
  ): Promise<WebGLController> {
    const { signal } = options;
    signal?.throwIfAborted();
    await this._pointsController.initialize({ signal });
    signal?.throwIfAborted();
    return this;
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

  resize(width: number, height: number): void {
    width *= window.devicePixelRatio;
    height *= window.devicePixelRatio;
    if (width <= 0 || height <= 0) {
      width = 1;
      height = 1;
    } else if (
      width > WebGLController.MAX_CANVAS_SIZE ||
      height > WebGLController.MAX_CANVAS_SIZE
    ) {
      const scale = WebGLController.MAX_CANVAS_SIZE / Math.max(width, height);
      width = Math.floor(width * scale);
      height = Math.floor(height * scale);
    }
    this._canvas.width = width;
    this._canvas.height = height;
    this._gl.viewport(0, 0, width, height);
  }

  draw(viewport: Rect): void {
    this._gl.clearColor(0, 0, 0, 0);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    this._pointsController.draw(viewport, this._drawOptions);
    this._shapesController.draw(viewport, this._drawOptions);
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
