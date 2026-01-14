import { type Model, type RawModel, createModel } from "./base";
import { identityTransform } from "./constants";
import { type SimilarityTransform } from "./types";

/**
 * Default values for {@link RawLayer}
 */
export const layerDefaults = {
  transform: identityTransform,
  visibility: true,
  opacity: 1,
  pointSizeFactor: 1,
} as const satisfies Partial<RawLayer>;

/**
 * A named collection of rendered data objects sharing the same (e.g. physical) coordinate system
 */
export interface RawLayer extends RawModel {
  /**
   * Layer ID
   */
  id: string;

  /**
   * Human-readable layer name
   */
  name: string;

  /**
   * Transformation from layer space to world space
   *
   * @defaultValue {@link layerDefaults.transform}
   */
  transform?: SimilarityTransform;

  /**
   * Layer visibility
   *
   * @defaultValue {@link layerDefaults.visibility}
   */
  visibility?: boolean;

  /**
   * Layer opacity, in the range [0, 1]
   *
   * @defaultValue {@link layerDefaults.opacity}
   */
  opacity?: number;

  /**
   * Layer-level point size scaling factor
   *
   * A unitless scaling factor by which all point sizes are multiplied.
   *
   * Can be used to adjust the size of all points in a layer relative to other layers.
   * Note that point sizes are also affected by {@link "./project".RawProject.drawOptions} as well as {@link "./points".RawPoints}-specific settings.
   *
   * @defaultValue {@link layerDefaults.pointSizeFactor}
   */
  pointSizeFactor?: number;
}

/**
 * A {@link RawLayer} with {@link layerDefaults} applied
 */
export type Layer = Model &
  Required<Pick<RawLayer, keyof typeof layerDefaults>> &
  Omit<
    RawLayer,
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    keyof Model | keyof typeof layerDefaults
  >;

/**
 * Creates a {@link Layer} from a {@link RawLayer} by applying {@link layerDefaults}
 *
 * @param rawLayer - The raw layer
 * @returns The complete layer with default values applied
 */
export function createLayer(rawLayer: RawLayer): Layer {
  return {
    ...createModel(rawLayer),
    ...structuredClone(layerDefaults),
    ...structuredClone(rawLayer),
  };
}
