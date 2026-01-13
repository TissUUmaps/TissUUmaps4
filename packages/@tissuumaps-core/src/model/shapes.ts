import {
  type ColorConfig,
  type OpacityConfig,
  type VisibilityConfig,
} from "../types/config";
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

export const shapesDefaults = {
  shapeFillColor: { value: { r: 255, g: 255, b: 255 } },
  shapeFillVisibility: { value: true },
  shapeFillOpacity: { value: 1 },
  shapeStrokeColor: { value: { r: 0, g: 0, b: 0 } },
  shapeStrokeVisibility: { value: true },
  shapeStrokeOpacity: { value: 1 },
};

/**
 * A two-dimensional shape cloud
 */
export interface RawShapes extends RawRenderedDataObject<
  RawShapesDataSource<string>,
  RawShapesLayerConfig
> {
  shapeFillColor?: ColorConfig;
  shapeFillVisibility?: VisibilityConfig;
  shapeFillOpacity?: OpacityConfig;
  shapeStrokeColor?: ColorConfig;
  shapeStrokeVisibility?: VisibilityConfig;
  shapeStrokeOpacity?: OpacityConfig;
}

/**
 * A {@link RawShapes} object with default values applied
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
 * Creates a {@link Shapes} from a {@link RawShapes} by applying default values
 *
 * @param rawShapes - The raw shapes
 * @returns The complete shapes with default values applied
 */
export function createShapes(rawShapes: RawShapes): Shapes {
  return {
    ...createRenderedDataObject(rawShapes),
    ...shapesDefaults,
    ...rawShapes,
    dataSource: createShapesDataSource(rawShapes.dataSource),
    layerConfigs: rawShapes.layerConfigs?.map(createShapesLayerConfig) ?? [],
  };
}

export const shapesDataSourceDefaults = {};

/**
 * A data source for two-dimensional shape clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawShapesDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {}

/**
 * A {@link RawShapesDataSource} with default values applied
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
 * Creates a {@link ShapesDataSource} from a {@link RawShapesDataSource} by applying default values
 *
 * @param rawShapesDataSource - The raw shapes data source
 * @returns The complete shapes data source with default values applied
 */
export function createShapesDataSource<TType extends string>(
  rawShapesDataSource: RawShapesDataSource<TType>,
): ShapesDataSource<TType> {
  return {
    ...createDataSource(rawShapesDataSource),
    ...shapesDataSourceDefaults,
    ...rawShapesDataSource,
  };
}

export const shapesLayerConfigDefaults = {};

/**
 * A layer-specific display configuration for two-dimensional shape clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawShapesLayerConfig extends RawLayerConfig {}

/**
 * A {@link RawShapesLayerConfig} with default values applied
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
 * Creates a {@link ShapesLayerConfig} from a {@link RawShapesLayerConfig} by applying default values
 *
 * @param rawShapesLayerConfig - The raw shapes layer configuration
 * @returns The complete shapes layer configuration with default values applied
 */
export function createShapesLayerConfig(
  rawShapesLayerConfig: RawShapesLayerConfig,
): ShapesLayerConfig {
  return {
    ...createLayerConfig(rawShapesLayerConfig),
    ...shapesLayerConfigDefaults,
    ...rawShapesLayerConfig,
  };
}
