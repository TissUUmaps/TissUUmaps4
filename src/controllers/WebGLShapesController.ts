import { IShapesData } from "../data/shapes";
import { ITableData } from "../data/table";
import { ILayerModel } from "../models/layer";
import { IShapesModel } from "../models/shapes";
import { DrawOptions } from "../models/types";
import { Rect } from "./WebGLController";
import WebGLControllerBase from "./WebGLControllerBase";

export default class WebGLShapesController extends WebGLControllerBase {
  constructor(gl: WebGL2RenderingContext) {
    super(gl);
  }

  async synchronize(
    _layerMap: Map<string, ILayerModel>,
    _shapesMap: Map<string, IShapesModel>,
    _loadShapes: (
      shapes: IShapesModel,
      signal?: AbortSignal,
    ) => Promise<IShapesData>,
    _loadTableByID: (
      tableId: string,
      signal?: AbortSignal,
    ) => Promise<ITableData>,
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
