import { Color, TableGroupsColumn, TableValuesColumn } from "../types";
import {
  RawDataSource,
  RawLayerConfig,
  RawRenderedDataModel,
  createDataSource,
  createLayerConfig,
  createRenderedDataModel,
} from "./base";

/** A 2D shape cloud */
export interface RawShapes
  extends RawRenderedDataModel<RawShapesDataSource, RawShapesLayerConfig> {
  /** Color for all shapes, a column containing shape-wise colors/group names, or random colors from colormap (default) */
  shapeColor?:
    | Color
    | TableValuesColumn
    | TableGroupsColumn
    | "randomFromColorMap";

  /** Global color map ID or custom color map */
  colorMap?: string | { [key: string]: Color };

  /** Visibility for all shapes, or a column containing shape-wise visibilities/group names (defaults to true) */
  shapeVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Global visibility map ID or custom visibility map */
  visibilityMap?: string | { [key: string]: boolean };

  /** Opacity for all shapes, between 0 and 1, or a column containing shape-wise opacities/group names (defaults to 1) */
  shapeOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /** Global opacity map ID or custom opacity map */
  opacityMap?: string | { [key: string]: number };
}

type DefaultedShapesKeys = keyof Omit<
  RawShapes,
  "id" | "name" | "dataSource" | "layerConfigs" | "visibilityMap" | "opacityMap"
>;

export type Shapes = Required<Pick<RawShapes, DefaultedShapesKeys>> &
  Omit<RawShapes, DefaultedShapesKeys>;

export function createShapes(rawShapes: RawShapes): Shapes {
  return {
    ...createRenderedDataModel(rawShapes),
    visibility: true,
    opacity: 1,
    shapeColor: "randomFromColorMap",
    colorMap: "batlowS",
    shapeVisibility: true,
    shapeOpacity: 1,
    ...rawShapes,
  };
}

/** A data source for 2D shape clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawShapesDataSource<TType extends string = string>
  extends RawDataSource<TType> {}

type DefaultedShapesDataSourceKeys<TType extends string = string> = keyof Omit<
  RawShapesDataSource<TType>,
  "type" | "url" | "path"
>;

export type ShapesDataSource<TType extends string = string> = Required<
  Pick<RawShapesDataSource<TType>, DefaultedShapesDataSourceKeys<TType>>
> &
  Omit<RawShapesDataSource<TType>, DefaultedShapesDataSourceKeys<TType>>;

export function createShapesDataSource<TType extends string = string>(
  rawShapesDataSource: RawShapesDataSource<TType>,
): ShapesDataSource<TType> {
  return { ...createDataSource(rawShapesDataSource), ...rawShapesDataSource };
}

/** A layer-specific display configuration for 2D shape clouds */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawShapesLayerConfig extends RawLayerConfig {}

type DefaultedShapesLayerConfigKeys = keyof Omit<
  RawShapesLayerConfig,
  "layerId"
>;

export type ShapesLayerConfig = Required<
  Pick<RawShapesLayerConfig, DefaultedShapesLayerConfigKeys>
> &
  Omit<RawShapesLayerConfig, DefaultedShapesLayerConfigKeys>;

export function createShapesLayerConfig(
  rawShapesLayerConfig: RawShapesLayerConfig,
): ShapesLayerConfig {
  return {
    ...createLayerConfig(rawShapesLayerConfig),
    flip: false,
    transform: {
      scale: 1,
      rotation: 0,
      translation: { x: 0, y: 0 },
    },
    ...rawShapesLayerConfig,
  };
}
