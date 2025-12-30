import { colorPalettes } from "../palettes";
import { type Color } from "../types/color";
import { type TableGroupsRef, type TableValuesRef } from "../types/tableRef";
import { type ColorMap, type ValueMap } from "../types/valueMap";
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
  shapeFillColor: { r: 255, g: 255, b: 255 },
  shapeFillColorPalette: "batlow",
  shapeFillVisibility: true,
  shapeFillOpacity: 1,
  shapeStrokeColor: { r: 0, g: 0, b: 0 },
  shapeStrokeColorPalette: "batlow",
  shapeStrokeVisibility: true,
  shapeStrokeOpacity: 1,
};

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
   * Can be specified as:
   * - A single color to set the same fill color for all shapes
   * - A table column holding continuous numerical values for each shape; values are clipped to {@link shapeFillColorRange}, which is linearly mapped to {@link shapeFillColorPalette}
   * - A table column holding categorical group names for each shape; group names are mapped to shape fill colors using {@link shapeFillColorMap}
   * - The special value "randomFromPalette" to assign each shape a random color from {@link shapeFillColorPalette}
   *
   * @defaultValue {@link shapesDefaults.shapeFillColor}
   */
  shapeFillColor?:
    | Color
    | TableValuesRef
    | TableGroupsRef
    | "randomFromPalette";

  /**
   * Value range that is linearly mapped to {@link shapeFillColorPalette}
   *
   * Table values are clipped to this range before mapping them to shape fill colors.
   *
   * Used when {@link shapeFillColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e., fall back to "minmax", emitting a warning when in use)
   */
  shapeFillColorRange?: [number, number] | "minmax";

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be specified as the name of a color palette defined in {@link colorPalettes}.
   *
   * Used when {@link shapeFillColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link shapesDefaults.shapeFillColorPalette}
   */
  shapeFillColorPalette?: keyof typeof colorPalettes;

  /**
   * Shape group-to-fill color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link shapeFillColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link shapesDefaults.shapeFillColor})
   */
  shapeFillColorMap?: string | ColorMap;

  /**
   * Shape fill visibility
   *
   * Can be specified as:
   * - A single boolean to set the same fill visibility for all shapes
   * - A table column holding numerical values for each shape; values are interpreted as boolean (0 = invisible, non-zero = visible)
   * - A table column holding categorical group names for each shape; group names are mapped to shape fill visibilities using {@link shapeFillVisibilityMap}
   *
   * @defaultValue {@link shapesDefaults.shapeFillVisibility}
   */
  shapeFillVisibility?: boolean | TableValuesRef | TableGroupsRef;

  /**
   * Shape group-to-fill visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link shapeFillVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link shapesDefaults.shapeFillVisibility})
   */
  shapeFillVisibilityMap?: string | ValueMap<boolean>;

  /**
   * Shape fill opacity
   *
   * Can be specified as:
   * - A single number in the range [0, 1] to set the same fill opacity for all shapes
   * - A table column holding numerical fill opacity values in the range [0, 1] for each shape
   * - A table column holding categorical group names for each shape; group names are mapped to fill opacities using {@link shapeFillOpacityMap}
   *
   * Note that shape opacities are also affected by {@link RawShapes.opacity} and {@link "./layer".RawLayer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link shapesDefaults.shapeFillOpacity}
   */
  shapeFillOpacity?: number | TableValuesRef | TableGroupsRef;

  /**
   * Shape group-to-fill opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link shapeFillOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link shapesDefaults.shapeFillOpacity})
   */
  shapeFillOpacityMap?: string | ValueMap<number>;

  /**
   * Shape stroke color
   *
   * Can be specified as:
   * - A single color to set the same stroke color for all shapes
   * - A table column holding continuous numerical values for each shape; values are clipped to {@link shapeStrokeColorRange}, which is linearly mapped to {@link shapeStrokeColorPalette}
   * - A table column holding categorical group names for each shape; group names are mapped to shape stroke colors using {@link shapeStrokeColorMap}
   * - The special value "randomFromPalette" to assign each shape a random color from {@link shapeStrokeColorPalette}
   *
   * @defaultValue {@link shapesDefaults.shapeStrokeColor}
   */
  shapeStrokeColor?:
    | Color
    | TableValuesRef
    | TableGroupsRef
    | "randomFromPalette";

  /**
   * Value range that is linearly mapped to {@link shapeStrokeColorPalette}
   *
   * Table values are clipped to this range before mapping them to shape stroke colors.
   *
   * Used when {@link shapeStrokeColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e.,  fall back to "minmax", emitting a warning when in use)
   */
  shapeStrokeColorRange?: [number, number] | "minmax";

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be specified as the name of a color palette defined in {@link colorPalettes}.
   *
   * Used when {@link shapeStrokeColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link shapesDefaults.shapeStrokeColorPalette}
   */
  shapeStrokeColorPalette?: keyof typeof colorPalettes;

  /**
   * Shape group-to-stroke color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link shapeStrokeColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link shapesDefaults.shapeStrokeColor})
   */
  shapeStrokeColorMap?: string | ColorMap;

  /**
   * Shape stroke visibility
   *
   * Can be specified as:
   * - A single boolean to set the same stroke visibility for all shapes
   * - A table column holding numerical values for each shape; values are interpreted as boolean (0 = invisible, non-zero = visible)
   * - A table column holding categorical group names for each shape; group names are mapped to shape stroke visibilities using {@link shapeStrokeVisibilityMap}
   *
   * @defaultValue {@link shapesDefaults.shapeStrokeVisibility}
   */
  shapeStrokeVisibility?: boolean | TableValuesRef | TableGroupsRef;

  /**
   * Shape group-to-stroke visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link shapeStrokeVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link shapesDefaults.shapeStrokeVisibility})
   */
  shapeStrokeVisibilityMap?: string | ValueMap<boolean>;

  /**
   * Shape stroke opacity
   *
   * Can be specified as:
   * - A single number in the range [0, 1] to set the same stroke opacity for all shapes
   * - A table column holding numerical stroke opacity values in the range [0, 1] for each shape
   * - A table column holding categorical group names for each shape; group names are mapped to stroke opacities using {@link shapeStrokeOpacityMap}
   *
   * Note that shape opacities are also affected by {@link RawShapes.opacity} and {@link "./layer".RawLayer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link shapesDefaults.shapeStrokeOpacity}
   */
  shapeStrokeOpacity?: number | TableValuesRef | TableGroupsRef;

  /**
   * Shape group-to-stroke opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link shapeStrokeOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link shapesDefaults.shapeStrokeOpacity})
   */
  shapeStrokeOpacityMap?: string | ValueMap<number>;
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
