// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { PointsData } from "../data/points";
import { COLOR_PALETTES } from "../palettes";
import {
  Color,
  ColorMap,
  Marker,
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CompleteProject } from "./project";

/** Default point marker of {@link Points} */
export const DEFAULT_POINT_MARKER: Marker = Marker.Disc;

/** Default point size of {@link Points} */
export const DEFAULT_POINT_SIZE: number = 1;

/** Default point size unit of {@link Points} */
export const DEFAULT_POINT_SIZE_UNIT: Exclude<
  Points["pointSizeUnit"],
  undefined
> = "data";

/** Default point size factor of {@link Points} */
export const DEFAULT_POINT_SIZE_FACTOR: number = 1;

/** Default point color of {@link Points} */
export const DEFAULT_POINT_COLOR: Color = { r: 255, g: 255, b: 255 };

/** Default point color palette of {@link Points} */
export const DEFAULT_POINT_COLOR_PALETTE: keyof typeof COLOR_PALETTES =
  "batlow";

/** Default point visibility of {@link Points} */
export const DEFAULT_POINT_VISIBILITY: boolean = true;

/** Default point opacity of {@link Points} */
export const DEFAULT_POINT_OPACITY: number = 1;

/**
 * A two-dimensional point cloud
 */
export interface Points
  extends RenderedDataObject<PointsDataSource, PointsLayerConfig> {
  /**
   * Point marker
   *
   * Can be specified as:
   * - A single marker to set the same shape for all points
   * - A table column holding numerical {@link Marker} enum values for each point
   * - A table column holding categorical group names for each point; group names are mapped to point markers using {@link pointMarkerMap}
   * - The special value "random" to assign each point a random marker from the available {@link Marker} enum values
   *
   * @defaultValue {@link DEFAULT_POINT_MARKER}
   */
  pointMarker?: Marker | TableValuesColumn | TableGroupsColumn | "random";

  /**
   * Point group-to-marker mapping
   *
   * Can be specified as:
   * - ID of a project-global marker map
   * - Object-specific mapping of group names to {@link Marker} enum values
   *
   * Used when {@link pointMarker} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_POINT_MARKER})
   */
  pointMarkerMap?: string | ValueMap<Marker>;

  /**
   * Point size
   *
   * Can be specified as:
   * - A single number to set the same size for all points
   * - A table column holding continuous numerical size values for each point
   * - A table column holding categorical group names for each point; group names are mapped to point sizes using {@link pointSizeMap}
   *
   * Point sizes are specified in units configured by {@link pointSizeUnit} and scaled accordingly for display.
   * Additionally, point sizes are scaled by {@link pointSizeFactor} and {@link Layer.pointSizeFactor}, independent of {@link pointSizeUnit}.
   *
   * @defaultValue {@link DEFAULT_POINT_SIZE}
   */
  pointSize?: number | TableValuesColumn | TableGroupsColumn;

  /**
   * Point group-to-size mapping
   *
   * Can be specified as:
   * - ID of a project-global size map
   * - Object-specific mapping of group names to size values
   *
   * Used when {@link pointSize} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_POINT_SIZE})
   */
  pointSizeMap?: string | ValueMap<number>;

  /**
   * Unit in which point sizes are specified
   *
   * Can be one of:
   * - "data": Point sizes are in data (e.g. pixel) dimensions
   * - "layer": Point sizes are in layer (e.g. physical) dimensions
   * - "world": Point sizes are in world (i.e. global) dimensions
   *
   * @defaultValue {@link DEFAULT_POINT_SIZE_UNIT}
   */
  pointSizeUnit?: "data" | "layer" | "world";

  /**
   * Object-level point size scaling factor
   *
   * A unitless scaling factor by which all point sizes are multiplied.
   *
   * Can be used to adjust the size of points without changing individual point sizes or the size unit.
   * Note that point sizes are also affected by {@link Layer.pointSizeFactor} and {@link CompleteProject.drawOptions}.
   *
   * @defaultValue {@link DEFAULT_POINT_SIZE_FACTOR}
   */
  pointSizeFactor?: number;

  /**
   * Point color
   *
   * Can be specified as:
   * - A single color to set the same color for all points
   * - A table column holding continuous numerical values for each point; values are clipped to {@link pointColorRange}, which is linearly mapped to {@link pointColorPalette}
   * - A table column holding categorical group names for each point; group names are mapped to point colors using {@link pointColorMap}
   * - The special value "randomFromPalette" to assign each point a random color from {@link pointColorPalette}
   *
   * @defaultValue {@link DEFAULT_POINT_COLOR}
   */
  pointColor?:
    | Color
    | TableValuesColumn
    | TableGroupsColumn
    | "randomFromPalette";

  /**
   * Value range that is linearly mapped to {@link pointColorPalette}
   *
   * Table values are clipped to this range before mapping them to point colors.
   *
   * Used when {@link pointColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue `undefined` (i.e., the range of values in the specified column is used)
   */
  pointColorRange?: [number, number];

  /**
   * Color palette to which clipped and rescaled numerical values are mapped
   *
   * Can be specified as the name of a color palette defined in {@link COLOR_PALETTES}.
   *
   * Used when {@link pointColor} is specified as a table column holding continuous numerical values.
   *
   * @defaultValue {@link DEFAULT_POINT_COLOR_PALETTE}
   */
  pointColorPalette?: keyof typeof COLOR_PALETTES;

  /**
   * Point group-to-color mapping
   *
   * Can be specified as:
   * - ID of a project-global color map
   * - A custom mapping of group names to colors
   *
   * Used when {@link pointColor} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_POINT_COLOR})
   */
  pointColorMap?: string | ColorMap;

  /**
   * Point visibility
   *
   * Can be specified as:
   * - A single boolean to set the same visibility for all points
   * - A table column holding numerical values for each point; values are interpreted as boolean (0 = invisible, non-zero = visible)
   * - A table column holding categorical group names for each point; group names are mapped to point visibilities using {@link pointVisibilityMap}
   *
   * @defaultValue {@link DEFAULT_POINT_VISIBILITY}
   */
  pointVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /**
   * Point group-to-visibility mapping
   *
   * Can be specified as:
   * - ID of a project-global visibility map
   * - Object-specific mapping of group names to boolean visibility values
   *
   * Used when {@link pointVisibility} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_POINT_VISIBILITY})
   */
  pointVisibilityMap?: string | ValueMap<boolean>;

  /**
   * Point opacity
   *
   * Can be specified as:
   * - A single number in the range [0, 1] to set the same opacity for all points
   * - A table column holding numerical opacity values in the range [0, 1] for each point
   * - A table column holding categorical group names for each point; group names are mapped to opacities using {@link pointOpacityMap}
   *
   * Note that point opacities are also affected by {@link Points.opacity} and {@link Layer.opacity}, which are multiplied to this value.
   *
   * @defaultValue {@link DEFAULT_POINT_OPACITY}
   */
  pointOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /**
   * Point group-to-opacity mapping
   *
   * Can be specified as:
   * - ID of a project-global opacity map
   * - Object-specific mapping of group names to opacity values in the range [0, 1]
   *
   * Used when {@link pointOpacity} is specified as a table column holding categorical group names.
   *
   * @defaultValue `undefined` (i.e., all groups default to {@link DEFAULT_POINT_OPACITY})
   */
  pointOpacityMap?: string | ValueMap<number>;
}

/**
 * {@link Points} properties that have default values
 *
 * @internal
 */
export type PointsKeysWithDefaults =
  | RenderedDataObjectKeysWithDefaults<PointsDataSource, PointsLayerConfig>
  | keyof Pick<
      Points,
      | "pointMarker"
      | "pointSize"
      | "pointSizeUnit"
      | "pointSizeFactor"
      | "pointColor"
      | "pointColorPalette"
      | "pointVisibility"
      | "pointOpacity"
    >;

/**
 * A {@link Points} object with default values applied
 *
 * @internal
 */
export type CompletePoints = Required<Pick<Points, PointsKeysWithDefaults>> &
  Omit<Points, PointsKeysWithDefaults>;

/**
 * Creates a {@link CompletePoints} from a {@link Points} by applying default values
 *
 * @param points - The raw points
 * @returns The complete points with default values applied
 *
 * @internal
 */
export function completePoints(points: Points): CompletePoints {
  return {
    ...completeRenderedDataObject(points),
    pointMarker: DEFAULT_POINT_MARKER,
    pointSize: DEFAULT_POINT_SIZE,
    pointSizeUnit: DEFAULT_POINT_SIZE_UNIT,
    pointSizeFactor: DEFAULT_POINT_SIZE_FACTOR,
    pointColor: DEFAULT_POINT_COLOR,
    pointColorPalette: DEFAULT_POINT_COLOR_PALETTE,
    pointVisibility: DEFAULT_POINT_VISIBILITY,
    pointOpacity: DEFAULT_POINT_OPACITY,
    ...points,
  };
}

/**
 * A data source for two-dimensional point clouds
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface PointsDataSource<TType extends string = string>
  extends DataSource<TType> {}

/**
 * {@link PointsDataSource} properties that have default values
 *
 * @internal
 */
export type PointsDataSourceKeysWithDefaults<TType extends string = string> =
  DataSourceKeysWithDefaults<TType>;

/**
 * A {@link PointsDataSource} with default values applied
 *
 * @internal
 */
export type CompletePointsDataSource<TType extends string = string> = Required<
  Pick<PointsDataSource<TType>, PointsDataSourceKeysWithDefaults<TType>>
> &
  Omit<PointsDataSource<TType>, PointsDataSourceKeysWithDefaults<TType>>;

/**
 * Creates a {@link CompletePointsDataSource} from a {@link PointsDataSource} by applying default values
 *
 * @param pointsDataSource - The raw points data source
 * @returns The complete points data source with default values applied
 *
 * @internal
 */
export function completePointsDataSource<TType extends string = string>(
  pointsDataSource: PointsDataSource<TType>,
): CompletePointsDataSource<TType> {
  return { ...completeDataSource(pointsDataSource), ...pointsDataSource };
}

/**
 * A layer-specific display configuration for two-dimensional point clouds
 */
export interface PointsLayerConfig extends LayerConfig {
  /**
   * Dimension containing point-wise X coordinates
   *
   * @see {@link PointsData.getDimensions}
   */
  x: string;

  /**
   * Dimension containing point-wise Y coordinates
   *
   * @see {@link PointsData.getDimensions}
   */
  y: string;
}

/**
 * {@link PointsLayerConfig} properties that have default values
 *
 * @internal
 */
export type PointsLayerConfigKeysWithDefaults = LayerConfigKeysWithDefaults;

/**
 * A {@link PointsLayerConfig} with default values applied
 *
 * @internal
 */
export type CompletePointsLayerConfig = Required<
  Pick<PointsLayerConfig, PointsLayerConfigKeysWithDefaults>
> &
  Omit<PointsLayerConfig, PointsLayerConfigKeysWithDefaults>;

/**
 * Creates a {@link CompletePointsLayerConfig} from a {@link PointsLayerConfig} by applying default values
 *
 * @param pointsLayerConfig - The raw points layer configuration
 * @returns The complete points layer configuration with default values applied
 *
 * @internal
 */
export function completePointsLayerConfig(
  pointsLayerConfig: PointsLayerConfig,
): CompletePointsLayerConfig {
  return { ...completeLayerConfig(pointsLayerConfig), ...pointsLayerConfig };
}
