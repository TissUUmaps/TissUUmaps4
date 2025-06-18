import { IModel } from "./base";
import { Transform } from "./types";

/** A named group of data (e.g., image, labels, points, shapes) sharing the same (e.g. physical) coordinate system */
export interface ILayerModel extends IModel {
  /** Name */
  name: string;

  /** Transformation from layer (e.g. physical) space to world space */
  tf2world?: Transform;

  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;
}
