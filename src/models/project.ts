import { IModel } from "./base";
import { IImageModel } from "./image";
import { ILabelsModel } from "./labels";
import { ILayerModel } from "./layer";
import { IPointsModel } from "./points";
import { IShapesModel } from "./shapes";
import { ITableModel } from "./table";

/** A project */
export interface IProjectModel extends IModel {
  /** Name */
  name: string;

  /** Layers */
  layers?: ILayerModel[];

  /** Images */
  images?: IImageModel[];

  /** Labels */
  labels?: ILabelsModel[];

  /** Points */
  points?: IPointsModel[];

  /** Shapes */
  shapes?: IShapesModel[];

  /** Tables */
  tables?: ITableModel[];
}
