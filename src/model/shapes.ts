import { COLOR_PALETTES } from "../palettes";
import {
  Color,
  ColorMap,
  TableGroupsColumn,
  TableValuesColumn,
  ValueMap,
} from "../types";
import {
  DataSource,
  DataSourceKeysWithDefaults,
  LayerConfig,
  LayerConfigKeysWithDefaults,
  RenderedDataObject,
  RenderedDataObjectKeysWithDefaults,
  completeDataSource,
  completeLayerConfig,
  completeRenderedDataObject,
} from "./base";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Layer } from "./layer";

/** Default shape color of {@link Shapes} */
export const DEFAULT_SHAPE_COLOR: Color = { r: 255, g: 255, b: 255 };

/** Default shape color palette of {@link Shapes} */
export const DEFAULT_SHAPE_COLOR_PALETTE: keyof typeof COLOR_PALETTES =
  "batlow";

/** Default shape visibility of {@link Shapes} */
export const DEFAULT_SHAPE_VISIBILITY: boolean = true;

/** Default shape opacity of {@link Shapes} */
export const DEFAULT_SHAPE_OPACITY: number = 1;

/**
 * A two-dimensional shape cloud
 */
export interface Shapes
  extends RenderedDataObject<ShapesDataSource, ShapesLayerConfig> {
  /**
   * Shape color
   *
   * Can be specified as:
   * - A single color to set the same color for all shapes
   * - A table column holding continuous numerical values for each shape; values are clipped to {@link shapeColorRange}, which is linearly mapped to {@link shapeColorPalette}
   * - A table column holding categorical group names for each shape; group names are mapped to shape colors using {@link shapeColorMap}
   * - The special value "random" to assign each shape a random color from {@link shapeColorPalette}
   *
   * @defaultValue {@link DEFAULT_SHAPE_COLOR}
   */
  shapeColor?: Color | TableValuesColumn | TableGroupsColumn | "random";

  /**
   * Value range that is linearly mapped to {@link shapeColorPalette}
   *
   * Table values are clipped to this range before mapping them to shape colors.
   *
   * Used when {@link shapeColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e., the range of values in the specified column is used)
   */
  shapeColorRange?: [number, number];

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be specified as the name of a color palette defined in {@link COLOR_PALETTES}.
   *
   * Used when {@link shapeColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link DEFAULT_SHAPE_COLOR_PALETTE}
   */
  shapeColorPalette?: keyof typeof COLOR_PALETTES;

  /**
   * Shape group-to-color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link shapeColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_COLOR})
   */
  shapeColorMap?: string | ColorMap;

  /**
   * Shape visibility
   *
   * Can be specified as:
   * - A single boolean to set the same visibility for all shapes
   * - A table column holding numerical values for each shape; values are interpreted as boolean (0 = invisible, non-zero = visible)
   * - A table column holding categorical group names for each shape; group names are mapped to shape visibilities using {@link shapeVisibilityMap}
   *
   * @defaultValue {@link DEFAULT_SHAPE_VISIBILITY}
   */
  shapeVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /**
   * Shape group-to-visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link shapeVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_VISIBILITY})
   */
  shapeVisibilityMap?: string | ValueMap<boolean>;

  /**
   * Shape opacity
   *
   * Can be specified as:
   * - A single number in the range [0, 1] to set the same opacity for all shapes
   * - A table column holding numerical opacity values in the range [0, 1] for each shape
   * - A table column holding categorical group names for each shape; group names are mapped to opacities using {@link shapeOpacityMap}
   *
   * Note that shape opacities are also affected by {@link Shapes.opacity} and {@link Layer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link DEFAULT_SHAPE_OPACITY}
   */
  shapeOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /**
   * Shape group-to-opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link shapeOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_OPACITY})
   */
  shapeOpacityMap?: string | ValueMap<number>;
}

/**
 * {@link Shapes} properties that have default values
 *
 * @internal
 */
export type ShapesKeysWithDefaults =
  | RenderedDataObjectKeysWithDefaults<ShapesDataSource, ShapesLayerConfig>
  | keyof Pick<
      Shapes,
      "shapeColor" | "shapeColorPalette" | "shapeVisibility" | "shapeOpacity"
    >;

/**
 * A {@link Shapes} object with default values applied
 *
 * @internal
 */
export type CompleteShapes = Required<Pick<Shapes, ShapesKeysWithDefaults>> &
  Omit<Shapes, ShapesKeysWithDefaults>;

/**
 * Creates a {@link CompleteShapes} from a {@link Shapes} by applying default values
 *
 * @param shapes - The raw shapes
 * @returns The complete shapes with default values applied
 *
 * @internal
 */
export function completeShapes(shapes: Shapes): CompleteShapes {
  return {
    ...completeRenderedDataObject(shapes),
    shapeColor: DEFAULT_SHAPE_COLOR,
    shapeColorPalette: DEFAULT_SHAPE_COLOR_PALETTE,
    shapeVisibility: DEFAULT_SHAPE_VISIBILITY,
    shapeOpacity: DEFAULT_SHAPE_OPACITY,
    ...shapes,
  };
}

/**
 * A data source for two-dimensional shape clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesDataSource<TType extends string = string>
  extends DataSource<TType> {}

/**
 * {@link ShapesDataSource} properties that have default values
 *
 * @internal
 */
export type ShapesDataSourceKeysWithDefaults<TType extends string = string> =
  DataSourceKeysWithDefaults<TType>;

/**
 * A {@link ShapesDataSource} with default values applied
 *
 * @internal
 */
export type CompleteShapesDataSource<TType extends string = string> = Required<
  Pick<ShapesDataSource<TType>, ShapesDataSourceKeysWithDefaults<TType>>
> &
  Omit<ShapesDataSource<TType>, ShapesDataSourceKeysWithDefaults<TType>>;

/**
 * Creates a {@link CompleteShapesDataSource} from a {@link ShapesDataSource} by applying default values
 *
 * @param shapesDataSource - The raw shapes data source
 * @returns The complete shapes data source with default values applied
 *
 * @internal
 */
export function completeShapesDataSource<TType extends string = string>(
  shapesDataSource: ShapesDataSource<TType>,
): CompleteShapesDataSource<TType> {
  return { ...completeDataSource(shapesDataSource), ...shapesDataSource };
}

/**
 * A layer-specific display configuration for two-dimensional shape clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ShapesLayerConfig extends LayerConfig {}

/**
 * {@link ShapesLayerConfig} properties that have default values
 *
 * @internal
 */
export type ShapesLayerConfigKeysWithDefaults = LayerConfigKeysWithDefaults;

/**
 * A {@link ShapesLayerConfig} with default values applied
 *
 * @internal
 */
export type CompleteShapesLayerConfig = Required<
  Pick<ShapesLayerConfig, ShapesLayerConfigKeysWithDefaults>
> &
  Omit<ShapesLayerConfig, ShapesLayerConfigKeysWithDefaults>;

/**
 * Creates a {@link CompleteShapesLayerConfig} from a {@link ShapesLayerConfig} by applying default values
 *
 * @param shapesLayerConfig - The raw shapes layer configuration
 * @returns The complete shapes layer configuration with default values applied
 *
 * @internal
 */
export function completeShapesLayerConfig(
  shapesLayerConfig: ShapesLayerConfig,
): CompleteShapesLayerConfig {
  return { ...completeLayerConfig(shapesLayerConfig), ...shapesLayerConfig };
}
