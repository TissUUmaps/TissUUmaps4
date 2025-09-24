import { IModel } from "./base";
import { SimilarityTransform } from "./types";

/** A named group of data (e.g., image, labels, points, shapes) sharing the same (e.g. physical) coordinate system */
export interface ILayerModel extends IModel {
  /** ID */
  id: string;

  /** Name */
  name: string;

  /** Transformation from layer space to world space (defaults to identity transform) */
  transform?: Partial<SimilarityTransform>;

  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;
}
