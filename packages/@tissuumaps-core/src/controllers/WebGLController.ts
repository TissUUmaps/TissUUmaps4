import { deepEqual } from "fast-equals";

import { defaultDrawOptions } from "../model/constants";
import { type DrawOptions } from "../model/types";
import { type Rect } from "../types";
import { WebGLUtils } from "../utils/WebGLUtils";
import { WebGLPointsController } from "./WebGLPointsController";
import { WebGLShapesController } from "./WebGLShapesController";

/**
 * Top-level WebGL controller that coordinates point and shape rendering
 *
 * Owns a `<canvas>` element, a {@link WebGL2RenderingContext}, and delegates
 * to {@link WebGLPointsController} and {@link WebGLShapesController} for
 * data-type-specific synchronization and drawing.
 */
export class WebGLController {
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/canvas#maximum_canvas_size
  private static readonly _maxCanvasSize = 4096;

  public readonly canvas: HTMLCanvasElement;
  private _viewport: Rect;
  private _drawOptions: DrawOptions;
  private _gl: WebGL2RenderingContext;
  private _pointsController: WebGLPointsController;
  private _shapesController: WebGLShapesController;

  /** Creates a positioned, full-size `<canvas>` element for the WebGL overlay */
  static createCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.style.position = "absolute";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    return canvas;
  }

  /**
   * @param canvas - The canvas element to draw on (typically created by {@link createCanvas})
   * @param viewport - Initial world-space viewport rectangle
   */
  constructor(canvas: HTMLCanvasElement, viewport: Rect) {
    this.canvas = canvas;
    this._viewport = viewport;
    this._drawOptions = structuredClone(defaultDrawOptions);
    this._gl = WebGLController._createWebGLContext(this.canvas);
    this._pointsController = new WebGLPointsController(this._gl);
    this._shapesController = new WebGLShapesController(this._gl);
    this.canvas.addEventListener("webglcontextlost", (event) => {
      event.preventDefault(); // allow context to be restored
    });
    this.canvas.addEventListener("webglcontextrestored", () => {
      this._gl = WebGLController._createWebGLContext(this.canvas);
      this._pointsController = new WebGLPointsController(this._gl);
      this._shapesController = new WebGLShapesController(this._gl);
    });
  }

  /**
   * Updates the world-space viewport rectangle
   *
   * @param newViewport - New viewport bounds in world coordinates
   * @returns `true` if the viewport actually changed, `false` otherwise
   */
  setViewport(newViewport: Rect): boolean {
    if (
      this._viewport.x !== newViewport.x ||
      this._viewport.y !== newViewport.y ||
      this._viewport.width !== newViewport.width ||
      this._viewport.height !== newViewport.height
    ) {
      this._viewport = newViewport;
      return true;
    }
    return false;
  }

  /**
   * Applies new draw options
   *
   * @param drawOptions - The new draw options
   * @returns Flags indicating whether points and/or shapes need to be re-synchronized, and whether a redraw is needed
   */
  setDrawOptions(drawOptions: DrawOptions): {
    syncPoints: boolean;
    syncShapes: boolean;
    redraw: boolean;
  } {
    if (!deepEqual(drawOptions, this._drawOptions)) {
      this._drawOptions = drawOptions;
      const syncShapes = this._shapesController.setNumScanlines(
        drawOptions.numShapesScanlines,
      );
      return { syncPoints: false, syncShapes, redraw: true };
    }
    return { syncPoints: false, syncShapes: false, redraw: false };
  }

  /**
   * Performs one-time asynchronous initialization (e.g. loading the marker atlas)
   *
   * @param options - Optional abort signal
   * @returns This controller instance, for chaining
   */
  async initialize(options?: {
    signal?: AbortSignal;
  }): Promise<WebGLController> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    await this._pointsController.initialize({ signal });
    signal?.throwIfAborted();
    return this;
  }

  /** Delegates to {@link WebGLPointsController.synchronize} */
  async synchronizePoints(
    ...args: Parameters<typeof WebGLPointsController.prototype.synchronize>
  ): ReturnType<typeof WebGLPointsController.prototype.synchronize> {
    return await this._pointsController.synchronize(...args);
  }

  /** Delegates to {@link WebGLShapesController.synchronize} */
  async synchronizeShapes(
    ...args: Parameters<typeof WebGLShapesController.prototype.synchronize>
  ): ReturnType<typeof WebGLShapesController.prototype.synchronize> {
    return await this._shapesController.synchronize(...args);
  }

  /**
   * Resizes the canvas to match the given screen-space dimensions,
   * accounting for `devicePixelRatio` and clamping to {@link _maxCanvasSize}
   *
   * @param newCanvasSize - Desired canvas size in screen-space pixels
   * @returns `true` if the canvas size actually changed, `false` otherwise
   */
  resizeCanvas(newCanvasSize: { width: number; height: number }): boolean {
    let { width, height } = newCanvasSize;
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
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this._gl.viewport(0, 0, width, height);
      return true;
    }
    return false;
  }

  /** Clears the canvas and draws all synchronized points and shapes */
  draw(): void {
    this._gl.clearColor(0, 0, 0, 0);
    this._gl.clear(this._gl.COLOR_BUFFER_BIT);
    this._pointsController.draw(this._viewport, this._drawOptions);
    this._shapesController.draw(this._viewport, this._drawOptions);
  }

  /** Releases all WebGL resources held by the points and shapes sub-controllers */
  destroy(): void {
    this._pointsController.destroy();
    this._shapesController.destroy();
  }

  /**
   * Creates a WebGL 2 rendering context on the given canvas
   *
   * Antialiasing is disabled and the drawing buffer is preserved so that
   * the canvas can be composited with the OpenSeadragon viewer.
   */
  private static _createWebGLContext(
    canvas: HTMLCanvasElement,
  ): WebGL2RenderingContext {
    return WebGLUtils.init(canvas, {
      antialias: false,
      preserveDrawingBuffer: true,
    });
  }
}
