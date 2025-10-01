import { SimilarityTransform } from "../types";
import { RawModel, createModel } from "./base";

/** A named group of data (e.g., image, labels, points, shapes) sharing the same (e.g. physical) coordinate system */
export interface RawLayer extends RawModel {
  /** ID */
  id: string;

  /** Name */
  name: string;

  /** Transformation from layer space to world space (defaults to identity transform) */
  transform?: SimilarityTransform;

  /** Visibility (defaults to true) */
  visibility?: boolean;

  /** Opacity, between 0 and 1 (defaults to 1) */
  opacity?: number;

  /** Point size factor (defaults to 1) */
  pointSizeFactor?: number;
}

type DefaultedLayerKeys = keyof Omit<RawLayer, "id" | "name">;

export type Layer = Required<Pick<RawLayer, DefaultedLayerKeys>> &
  Omit<RawLayer, DefaultedLayerKeys>;

export function createLayer(rawLayer: RawLayer): Layer {
  return {
    ...createModel(rawLayer),
    transform: {
      scale: 1,
      rotation: 0,
      translation: { x: 0, y: 0 },
    },
    visibility: true,
    opacity: 1,
    pointSizeFactor: 1,
    ...rawLayer,
  };
}
