import { ShapesData } from "../../../data/shapes";
import { TableData } from "../../../data/table";
import { Layer } from "../../../model/layer";
import { Shapes } from "../../../model/shapes";
import { DrawOptions, Rect } from "../../../types";
import WebGLControllerBase from "./WebGLControllerBase";

export default class WebGLShapesController extends WebGLControllerBase {
  constructor(gl: WebGL2RenderingContext) {
    super(gl);
  }

  async synchronize(
    _layerMap: Map<string, Layer>,
    _shapesMap: Map<string, Shapes>,
    _loadShapes: (shapes: Shapes, signal?: AbortSignal) => Promise<ShapesData>,
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
