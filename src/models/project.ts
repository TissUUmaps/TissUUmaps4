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

  /** Layers (layer ID -> layer) */
  layers?: Map<string, ILayerModel>;

  /** Images (image ID -> image) */
  images?: Map<string, IImageModel>;

  /** Labels (labels ID -> labels) */
  labels?: Map<string, ILabelsModel>;

  /** Points (points ID -> points) */
  points?: Map<string, IPointsModel>;

  /** Shapes (shapes ID -> shapes) */
  shapes?: Map<string, IShapesModel>;

  /** Tables (table ID -> table) */
  tables?: Map<string, ITableModel>;
}
