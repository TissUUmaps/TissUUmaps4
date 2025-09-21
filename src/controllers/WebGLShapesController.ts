import { IShapesData } from "../data/shapes";
import { ITableData } from "../data/table";
import { ILayerModel } from "../models/layer";
import { IShapesModel } from "../models/shapes";
import { BlendMode } from "../models/types";
import { Rect } from "./WebGLController";
import WebGLControllerBase from "./WebGLControllerBase";

export default class WebGLShapesController extends WebGLControllerBase {
  constructor(gl: WebGL2RenderingContext) {
    super(gl);
  }

  async synchronize(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _layerMap: Map<string, ILayerModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _shapesMap: Map<string, IShapesModel>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadShapes: (shapes: IShapesModel) => Promise<IShapesData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _loadTableByID: (tableId: string) => Promise<ITableData>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _checkAbort: () => boolean,
  ): Promise<boolean> {
    // TODO synchronize shapes
    return await Promise.resolve(true);
  }

  draw(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _viewport: Rect,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _blendMode: BlendMode,
  ): void {
    // TODO draw shapes
  }

  destroy(): void {}
}
