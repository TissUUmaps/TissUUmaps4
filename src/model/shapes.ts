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

/** Default shape fill color of {@link Shapes} */
export const DEFAULT_SHAPE_FILL_COLOR: Color = { r: 255, g: 255, b: 255 };

/** Default shape fill color palette of {@link Shapes} */
export const DEFAULT_SHAPE_FILL_COLOR_PALETTE: keyof typeof COLOR_PALETTES =
  "batlow";

/** Default shape fill visibility of {@link Shapes} */
export const DEFAULT_SHAPE_FILL_VISIBILITY: boolean = true;

/** Default shape fill opacity of {@link Shapes} */
export const DEFAULT_SHAPE_FILL_OPACITY: number = 1;

/** Default shape stroke color of {@link Shapes} */
export const DEFAULT_SHAPE_STROKE_COLOR: Color = { r: 0, g: 0, b: 0 };

/** Default shape stroke color palette of {@link Shapes} */
export const DEFAULT_SHAPE_STROKE_COLOR_PALETTE: keyof typeof COLOR_PALETTES =
  "batlow";

/** Default shape stroke visibility of {@link Shapes} */
export const DEFAULT_SHAPE_STROKE_VISIBILITY: boolean = true;

/** Default shape stroke opacity of {@link Shapes} */
export const DEFAULT_SHAPE_STROKE_OPACITY: number = 1;

/**
 * A two-dimensional shape cloud
 */
export interface Shapes
  extends RenderedDataObject<ShapesDataSource, ShapesLayerConfig> {
  /**
   * Shape fill color
   *
   * Can be specified as:
   * - A single color to set the same fill color for all shapes
   * - A table column holding continuous numerical values for each shape; values are clipped to {@link shapeFillColorRange}, which is linearly mapped to {@link shapeFillColorPalette}
   * - A table column holding categorical group names for each shape; group names are mapped to shape fill colors using {@link shapeFillColorMap}
   * - The special value "randomFromPalette" to assign each shape a random color from {@link shapeFillColorPalette}
   *
   * @defaultValue {@link DEFAULT_SHAPE_FILL_COLOR}
   */
  shapeFillColor?:
    | Color
    | TableValuesColumn
    | TableGroupsColumn
    | "randomFromPalette";

  /**
   * Value range that is linearly mapped to {@link shapeFillColorPalette}
   *
   * Table values are clipped to this range before mapping them to shape fill colors.
   *
   * Used when {@link shapeFillColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e., the range of values in the specified column is used)
   */
  shapeFillColorRange?: [number, number];

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be specified as the name of a color palette defined in {@link COLOR_PALETTES}.
   *
   * Used when {@link shapeFillColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link DEFAULT_SHAPE_FILL_COLOR_PALETTE}
   */
  shapeFillColorPalette?: keyof typeof COLOR_PALETTES;

  /**
   * Shape group-to-fill color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link shapeFillColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_FILL_COLOR})
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
   * @defaultValue {@link DEFAULT_SHAPE_FILL_VISIBILITY}
   */
  shapeFillVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /**
   * Shape group-to-fill visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link shapeFillVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_FILL_VISIBILITY})
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
   * Note that shape opacities are also affected by {@link Shapes.opacity} and {@link Layer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link DEFAULT_SHAPE_FILL_OPACITY}
   */
  shapeFillOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /**
   * Shape group-to-fill opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link shapeFillOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_FILL_OPACITY})
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
   * @defaultValue {@link DEFAULT_SHAPE_STROKE_COLOR}
   */
  shapeStrokeColor?:
    | Color
    | TableValuesColumn
    | TableGroupsColumn
    | "randomFromPalette";

  /**
   * Value range that is linearly mapped to {@link shapeStrokeColorPalette}
   *
   * Table values are clipped to this range before mapping them to shape stroke colors.
   *
   * Used when {@link shapeStrokeColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e., the range of values in the specified column is used)
   */
  shapeStrokeColorRange?: [number, number];

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be specified as the name of a color palette defined in {@link COLOR_PALETTES}.
   *
   * Used when {@link shapeStrokeColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link DEFAULT_SHAPE_STROKE_COLOR_PALETTE}
   */
  shapeStrokeColorPalette?: keyof typeof COLOR_PALETTES;

  /**
   * Shape group-to-stroke color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link shapeStrokeColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_STROKE_COLOR})
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
   * @defaultValue {@link DEFAULT_SHAPE_STROKE_VISIBILITY}
   */
  shapeStrokeVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /**
   * Shape group-to-stroke visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link shapeStrokeVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_STROKE_VISIBILITY})
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
   * Note that shape opacities are also affected by {@link Shapes.opacity} and {@link Layer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link DEFAULT_SHAPE_STROKE_OPACITY}
   */
  shapeStrokeOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /**
   * Shape group-to-stroke opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link shapeStrokeOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_SHAPE_STROKE_OPACITY})
   */
  shapeStrokeOpacityMap?: string | ValueMap<number>;
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
      | "shapeFillColor"
      | "shapeFillColorPalette"
      | "shapeFillVisibility"
      | "shapeFillOpacity"
      | "shapeStrokeColor"
      | "shapeStrokeColorPalette"
      | "shapeStrokeVisibility"
      | "shapeStrokeOpacity"
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
    shapeFillColor: DEFAULT_SHAPE_FILL_COLOR,
    shapeFillColorPalette: DEFAULT_SHAPE_FILL_COLOR_PALETTE,
    shapeFillVisibility: DEFAULT_SHAPE_FILL_VISIBILITY,
    shapeFillOpacity: DEFAULT_SHAPE_FILL_OPACITY,
    shapeStrokeColor: DEFAULT_SHAPE_STROKE_COLOR,
    shapeStrokeColorPalette: DEFAULT_SHAPE_STROKE_COLOR_PALETTE,
    shapeStrokeVisibility: DEFAULT_SHAPE_STROKE_VISIBILITY,
    shapeStrokeOpacity: DEFAULT_SHAPE_STROKE_OPACITY,
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
