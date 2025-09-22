import { IModel } from "./base";

/** A named group of data (e.g., image, labels, points, shapes) sharing the same (e.g. physical) coordinate system */
export interface ILayerModel extends IModel {
  /** ID */
  id: string;

  /** Name */
  name: string;

  /** Scale factor, converts from physical/layer space to world space (defaults to 1) */
  scale?: number;

  /** Translation, in world coordinates (i.e. after scaling; defaults to 0) */
  translation?: { x: number; y: number };

  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;
}
