import { ShapesData } from "../../../data/shapes";
import { TableData } from "../../../data/table";
import { CompleteLayer } from "../../../model/layer";
import { CompleteShapes } from "../../../model/shapes";
import { DrawOptions, Rect } from "../../../types";
import WebGLControllerBase from "./WebGLControllerBase";

export default class WebGLShapesController extends WebGLControllerBase {
  constructor(gl: WebGL2RenderingContext) {
    super(gl);
  }

  async synchronize(
    _layerMap: Map<string, CompleteLayer>,
    _shapesMap: Map<string, CompleteShapes>,
    _loadShapes: (
      shapes: CompleteShapes,
      signal?: AbortSignal,
    ) => Promise<ShapesData>,
    _loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<TableData>,
    signal?: AbortSignal,
  ): Promise<void> {
    signal?.throwIfAborted();
    // TODO synchronize shapes
    await Promise.resolve();
  }

  draw(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _viewport: Rect,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _drawOptions: DrawOptions,
  ): void {
    // TODO draw shapes
  }

  destroy(): void {}
}
