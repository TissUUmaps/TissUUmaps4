import { ModelBase } from "./base";
import { ImageModel } from "./image";
import { LabelsModel } from "./labels";
import { LayerModel } from "./layer";
import { PointsModel } from "./points";
import { ShapesModel } from "./shapes";

/** A project */
export interface ProjectModel extends ModelBase {
  /** Name */
  name: string;

  /** Layers (layer ID -> layer) */
  layers: Map<string, LayerModel>;

  /** Images (image ID -> image) */
  images?: Map<string, ImageModel>;

  /** Labels (labels ID -> labels) */
  labels?: Map<string, LabelsModel>;

  /** Points (points ID -> points) */
  points?: Map<string, PointsModel>;

  /** Shapes (shapes ID -> shapes) */
  shapes?: Map<string, ShapesModel>;
}
