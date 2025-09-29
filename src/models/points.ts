import batlowS from "../assets/colormaps/batlowS.txt?raw";
import { Color, Marker, TableGroupsColumn, TableValuesColumn } from "../types";
import ColorUtils from "../utils/ColorUtils";
import {
  RawDataSource,
  RawLayerConfig,
  RawRenderedDataModel,
  createDataSource,
  createLayerConfig,
  createRenderedDataModel,
} from "./base";

export const DEFAULT_POINT_SIZE = 1;
export const DEFAULT_POINT_MARKER = Marker.Disc;
export const DEFAULT_POINT_COLOR: Color = { r: 255, g: 255, b: 255 };
export const DEFAULT_POINT_VISIBILITY = true;
export const DEFAULT_POINT_OPACITY = 1;

export const DEFAULT_POINT_SIZES: number[] = [DEFAULT_POINT_SIZE];
export const DEFAULT_POINT_COLORS: Color[] = ColorUtils.parseColormap(batlowS);
export const DEFAULT_POINT_VISIBILITIES: boolean[] = [DEFAULT_POINT_VISIBILITY];
export const DEFAULT_POINT_OPACITIES: number[] = [DEFAULT_POINT_OPACITY];
export const DEFAULT_POINT_MARKERS: Marker[] = [
  Marker.Cross,
  Marker.Diamond,
  Marker.Square,
  Marker.TriangleUp,
  Marker.Star,
  Marker.Clobber,
  Marker.Disc,
  Marker.HBar,
  Marker.VBar,
  Marker.TailedArrow,
  Marker.TriangleDown,
  Marker.Ring,
  Marker.X,
  Marker.Arrow,
  Marker.Gaussian,
];

/** A 2D point cloud */
export interface RawPoints
  extends RawRenderedDataModel<RawPointsDataSource, RawPointsLayerConfig> {
  /** Size for all points, or column containing point-wise sizes/group names (defaults to 1) */
  pointSize?: number | TableValuesColumn | TableGroupsColumn;

  /** Unit for point sizes (defaults to "data") */
  pointSizeUnit?: "data" | "layer" | "world";

  /** Point size factor (defaults to 1) */
  pointSizeFactor?: number;

  /** Global size map ID or custom size map */
  sizeMap?: string | { [key: string]: number };

  /** Shape for all points, or column containing point-wise shapes/group names (defaults to disc) */
  pointMarker?: Marker | TableValuesColumn | TableGroupsColumn;

  /** Global marker map ID or custom marker map */
  markerMap?: string | { [key: string]: Marker };

  /** Color for all points, or column containing point-wise colors/group names (defaults to white) */
  pointColor?: Color | TableValuesColumn | TableGroupsColumn;

  /** Global color map ID or custom color map */
  colorMap?: string | { [key: string]: Color };

  /** Visibility for all points, or column containing point-wise visibilities/group names (defaults to true) */
  pointVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Global visibility map ID or custom visibility map */
  visibilityMap?: string | { [key: string]: boolean };

  /** Opacity for all points, between 0 and 1, or column containing point-wise opacities/group names (defaults to 1) */
  pointOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /** Global opacity map ID or custom opacity map */
  opacityMap?: string | { [key: string]: number };
}

type DefaultedPointsKeys = keyof Omit<
  RawPoints,
  | "id"
  | "name"
  | "dataSource"
  | "layerConfigs"
  | "sizeMap"
  | "colorMap"
  | "visibilityMap"
  | "opacityMap"
  | "markerMap"
>;

export type Points = Required<Pick<RawPoints, DefaultedPointsKeys>> &
  Omit<RawPoints, DefaultedPointsKeys>;

export function createPoints(rawPoints: RawPoints): Points {
  return {
    ...createRenderedDataModel(rawPoints),
    visibility: true,
    opacity: 1,
    pointSize: DEFAULT_POINT_SIZE,
    pointSizeUnit: "data",
    pointSizeFactor: 1,
    pointMarker: DEFAULT_POINT_MARKER,
    pointColor: DEFAULT_POINT_COLOR,
    pointVisibility: DEFAULT_POINT_VISIBILITY,
    pointOpacity: DEFAULT_POINT_OPACITY,
    ...rawPoints,
  };
}

/** A data source for 2D point clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawPointsDataSource<TType extends string = string>
  extends RawDataSource<TType> {}

type DefaultedPointsDataSourceKeys<TType extends string = string> = keyof Omit<
  RawPointsDataSource<TType>,
  "type" | "url" | "path"
>;

export type PointsDataSource<TType extends string = string> = Required<
  Pick<RawPointsDataSource<TType>, DefaultedPointsDataSourceKeys<TType>>
> &
  Omit<RawPointsDataSource<TType>, DefaultedPointsDataSourceKeys<TType>>;

export function createPointsDataSource<TType extends string = string>(
  rawPointsDataSource: RawPointsDataSource<TType>,
): PointsDataSource<TType> {
  return { ...createDataSource(rawPointsDataSource), ...rawPointsDataSource };
}

/** A layer-specific display configuration for 2D point clouds */
export interface RawPointsLayerConfig extends RawLayerConfig {
  /** Dimension containing point-wise X coordinates */
  x: string;

  /** Dimension containing point-wise Y coordinates */
  y: string;
}

type DefaultedPointsLayerConfigKeys = keyof Omit<
  RawPointsLayerConfig,
  "layerId" | "x" | "y"
>;

export type PointsLayerConfig = Required<
  Pick<RawPointsLayerConfig, DefaultedPointsLayerConfigKeys>
> &
  Omit<RawPointsLayerConfig, DefaultedPointsLayerConfigKeys>;

export function createPointsLayerConfig(
  rawPointsLayerConfig: RawPointsLayerConfig,
): PointsLayerConfig {
  return {
    ...createLayerConfig(rawPointsLayerConfig),
    flip: false,
    transform: {
      scale: 1,
      rotation: 0,
      translation: { x: 0, y: 0 },
    },
    ...rawPointsLayerConfig,
  };
}
