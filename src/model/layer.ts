import { SimilarityTransform } from "../types";
import { Model, ModelKeysWithDefaults, completeModel } from "./base";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Points } from "./points";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CompleteProject } from "./project";

/**
 * Default transformation of {@link Layer}
 */
export const DEFAULT_LAYER_TRANSFORM: SimilarityTransform = {
  scale: 1,
  rotation: 0,
  translation: { x: 0, y: 0 },
};

/**
 * Default visibility of {@link Layer}
 */
export const DEFAULT_LAYER_VISIBILITY: boolean = true;

/**
 * Default opacity of {@link Layer}
 */
export const DEFAULT_LAYER_OPACITY: number = 1;

/**
 * Default point size factor of {@link Layer}
 */
export const DEFAULT_LAYER_POINT_SIZE_FACTOR: number = 1;

/**
 * A named collection of rendered data objects sharing the same (e.g. physical) coordinate system
 */
export interface Layer extends Model {
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
   * @defaultValue {@link DEFAULT_LAYER_TRANSFORM}
   */
  transform?: SimilarityTransform;

  /**
   * Layer visibility
   *
   * @defaultValue {@link DEFAULT_LAYER_VISIBILITY}
   */
  visibility?: boolean;

  /**
   * Layer opacity, in the range [0, 1]
   *
   * @defaultValue {@link DEFAULT_LAYER_OPACITY}
   */
  opacity?: number;

  /**
   * Layer-level point size scaling factor
   *
   * A unitless scaling factor by which all point sizes are multiplied.
   *
   * Can be used to adjust the size of all points in a layer relative to other layers.
   * Note that point sizes are also affected by {@link CompleteProject.drawOptions} as well as {@link Points}-specific settings.
   *
   * @defaultValue {@link DEFAULT_LAYER_POINT_SIZE_FACTOR}
   */
  pointSizeFactor?: number;
}

/**
 * {@link Layer} properties that have default values
 *
 * @internal
 */
export type LayerKeysWithDefaults =
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | ModelKeysWithDefaults
  | "transform"
  | "visibility"
  | "opacity"
  | "pointSizeFactor";

/**
 * A {@link Layer} with default values applied
 *
 * @internal
 */
export type CompleteLayer = Required<Pick<Layer, LayerKeysWithDefaults>> &
  Omit<Layer, LayerKeysWithDefaults>;

/**
 * Creates a {@link CompleteLayer} from a {@link Layer} by applying default values
 *
 * @param layer - The raw layer
 * @returns The complete layer with default values applied
 *
 * @internal
 */
export function completeLayer(layer: Layer): CompleteLayer {
  return {
    ...completeModel(layer),
    transform: DEFAULT_LAYER_TRANSFORM,
    visibility: DEFAULT_LAYER_VISIBILITY,
    opacity: DEFAULT_LAYER_OPACITY,
    pointSizeFactor: DEFAULT_LAYER_POINT_SIZE_FACTOR,
    ...layer,
  };
}
