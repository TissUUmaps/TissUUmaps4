import {
  type DataSource,
  type LayerConfig,
  type RawDataSource,
  type RawLayerConfig,
  type RawRenderedDataObject,
  type RenderedDataObject,
  createDataSource,
  createLayerConfig,
  createRenderedDataObject,
} from "./base";
import {
  type ColorConfig,
  type OpacityConfig,
  type VisibilityConfig,
} from "./configs";
import {
  defaultShapeFillColor,
  defaultShapeFillOpacity,
  defaultShapeFillVisibility,
  defaultShapeStrokeColor,
  defaultShapeStrokeOpacity,
  defaultShapeStrokeVisibility,
} from "./constants";

/**
 * Default values for {@link RawShapes}
 */
export const shapesDefaults = {
  shapeFillColor: { constant: { value: defaultShapeFillColor } },
  shapeFillVisibility: { constant: { value: defaultShapeFillVisibility } },
  shapeFillOpacity: { constant: { value: defaultShapeFillOpacity } },
  shapeStrokeColor: { constant: { value: defaultShapeStrokeColor } },
  shapeStrokeVisibility: { constant: { value: defaultShapeStrokeVisibility } },
  shapeStrokeOpacity: { constant: { value: defaultShapeStrokeOpacity } },
} as const satisfies Partial<RawShapes>;

/**
 * A two-dimensional shape cloud
 */
export interface RawShapes extends RawRenderedDataObject<
  RawShapesDataSource<string>,
  RawShapesLayerConfig
> {
  /**
   * Shape fill color
   *
   * @defaultValue {@link shapesDefaults.shapeFillColor}
   */
  shapeFillColor?: ColorConfig;

  /**
   * Shape fill visibility
   *
   * @defaultValue {@link shapesDefaults.shapeFillVisibility}
   */
  shapeFillVisibility?: VisibilityConfig;

  /**
   * Shape fill opacity
   *
   * @defaultValue {@link shapesDefaults.shapeFillOpacity}
   */
  shapeFillOpacity?: OpacityConfig;

  /**
   * Shape stroke color
   *
   * @defaultValue {@link shapesDefaults.shapeStrokeColor}
   */
  shapeStrokeColor?: ColorConfig;

  /**
   * Shape stroke visibility
   *
   * @defaultValue {@link shapesDefaults.shapeStrokeVisibility}
   */
  shapeStrokeVisibility?: VisibilityConfig;

  /**
   * Shape stroke opacity
   *
   * @defaultValue {@link shapesDefaults.shapeStrokeOpacity}
   */
  shapeStrokeOpacity?: OpacityConfig;
}

/**
 * A {@link RawShapes} object with {@link shapesDefaults} applied
 */
export type Shapes = RenderedDataObject<
  ShapesDataSource<string>,
  ShapesLayerConfig
> &
  Required<Pick<RawShapes, keyof typeof shapesDefaults>> &
  Omit<
    RawShapes,
    | keyof RenderedDataObject<ShapesDataSource<string>, ShapesLayerConfig>
    | keyof typeof shapesDefaults
  >;

/**
 * Creates a {@link Shapes} from a {@link RawShapes} by applying {@link shapesDefaults}
 *
 * @param rawShapes - The raw shapes
 * @returns The complete shapes with default values applied
 */
export function createShapes(rawShapes: RawShapes): Shapes {
  return {
    ...createRenderedDataObject(rawShapes),
    ...structuredClone(shapesDefaults),
    ...structuredClone(rawShapes),
    dataSource: createShapesDataSource(rawShapes.dataSource),
    layerConfigs: rawShapes.layerConfigs?.map(createShapesLayerConfig) ?? [],
  };
}

/**
 * Default values for {@link RawShapesDataSource}
 */
export const shapesDataSourceDefaults = {} as const satisfies Partial<
  RawShapesDataSource<string>
>;

/**
 * A data source for two-dimensional shape clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawShapesDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {}

/**
 * A {@link RawShapesDataSource} with {@link shapesDataSourceDefaults} applied
 */
export type ShapesDataSource<TType extends string = string> =
  DataSource<TType> &
    Required<
      Pick<RawShapesDataSource<TType>, keyof typeof shapesDataSourceDefaults>
    > &
    Omit<
      RawShapesDataSource<TType>,
      | keyof DataSource<TType>
      // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
      | keyof typeof shapesDataSourceDefaults
    >;

/**
 * Creates a {@link ShapesDataSource} from a {@link RawShapesDataSource} by applying {@link shapesDataSourceDefaults}
 *
 * @param rawShapesDataSource - The raw shapes data source
 * @returns The complete shapes data source with default values applied
 */
export function createShapesDataSource<TType extends string>(
  rawShapesDataSource: RawShapesDataSource<TType>,
): ShapesDataSource<TType> {
  return {
    ...createDataSource(rawShapesDataSource),
    ...structuredClone(shapesDataSourceDefaults),
    ...structuredClone(rawShapesDataSource),
  };
}

/**
 * Default values for {@link RawShapesLayerConfig}
 */
export const shapesLayerConfigDefaults =
  {} as const satisfies Partial<RawShapesLayerConfig>;

/**
 * A layer-specific display configuration for two-dimensional shape clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawShapesLayerConfig extends RawLayerConfig {}

/**
 * A {@link RawShapesLayerConfig} with {@link shapesLayerConfigDefaults} applied
 */
export type ShapesLayerConfig = LayerConfig &
  Required<Pick<RawShapesLayerConfig, keyof typeof shapesLayerConfigDefaults>> &
  Omit<
    RawShapesLayerConfig,
    | keyof LayerConfig
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof shapesLayerConfigDefaults
  >;

/**
 * Creates a {@link ShapesLayerConfig} from a {@link RawShapesLayerConfig} by applying {@link shapesLayerConfigDefaults}
 *
 * @param rawShapesLayerConfig - The raw shapes layer configuration
 * @returns The complete shapes layer configuration with default values applied
 */
export function createShapesLayerConfig(
  rawShapesLayerConfig: RawShapesLayerConfig,
): ShapesLayerConfig {
  return {
    ...createLayerConfig(rawShapesLayerConfig),
    ...structuredClone(shapesLayerConfigDefaults),
    ...structuredClone(rawShapesLayerConfig),
  };
}
