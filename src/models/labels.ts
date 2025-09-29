import { Color, TableGroupsColumn, TableValuesColumn } from "../types";
import {
  RawDataSource,
  RawLayerConfig,
  RawRenderedDataModel,
  createDataSource,
  createLayerConfig,
  createRenderedDataModel,
} from "./base";

/** A 2D labels mask */
export interface RawLabels
  extends RawRenderedDataModel<RawLabelsDataSource, RawLabelsLayerConfig> {
  /** Color for all labels, column containing label-wise colors/group names, or random colors from colormap (default) */
  labelColor?:
    | Color
    | TableValuesColumn
    | TableGroupsColumn
    | "randomFromColorMap";

  /** Global color map ID or custom color map (defaults to "batlowS") */
  colorMap?: string | { [key: string]: Color };

  /** Visibility for all labels, or column containing label-wise visibilities/group names (defaults to true) */
  labelVisibility?: boolean | TableValuesColumn | TableGroupsColumn;

  /** Global visibility map ID or custom visibility map */
  visibilityMap?: string | { [key: string]: boolean };

  /** Opacity for all labels, between 0 and 1, or column containing label-wise opacities/group names (defaults to 1) */
  labelOpacity?: number | TableValuesColumn | TableGroupsColumn;

  /** Global opacity map ID or custom opacity map */
  opacityMap?: string | { [key: string]: number };
}

type DefaultedLabelsKeys = keyof Omit<
  RawLabels,
  "id" | "name" | "dataSource" | "layerConfigs" | "visibilityMap" | "opacityMap"
>;

export type Labels = Required<Pick<RawLabels, DefaultedLabelsKeys>> &
  Omit<RawLabels, DefaultedLabelsKeys>;

export function createLabels(rawLabels: RawLabels): Labels {
  return {
    ...createRenderedDataModel(rawLabels),
    visibility: true,
    opacity: 1,
    labelColor: "randomFromColorMap",
    colorMap: "batlowS",
    labelVisibility: true,
    labelOpacity: 1,
    ...rawLabels,
  };
}

/** A data source for 2D labels masks */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawLabelsDataSource<TType extends string = string>
  extends RawDataSource<TType> {}

type DefaultedLabelsDataSourceKeys<TType extends string = string> = keyof Omit<
  RawLabelsDataSource<TType>,
  "type" | "url" | "path"
>;

export type LabelsDataSource<TType extends string = string> = Required<
  Pick<RawLabelsDataSource<TType>, DefaultedLabelsDataSourceKeys<TType>>
> &
  Omit<RawLabelsDataSource<TType>, DefaultedLabelsDataSourceKeys<TType>>;

export function createLabelsDataSource<TType extends string = string>(
  rawLabelsDataSource: RawLabelsDataSource<TType>,
): LabelsDataSource<TType> {
  return { ...createDataSource(rawLabelsDataSource), ...rawLabelsDataSource };
}

/** A layer-specific display configuration for 2D labels masks */
export interface RawLabelsLayerConfig extends RawLayerConfig {
  /** Layer ID */
  layerId: string;
}

type DefaultedLabelsLayerConfigKeys = keyof Omit<
  RawLabelsLayerConfig,
  "layerId"
>;

export type LabelsLayerConfig = Required<
  Pick<RawLabelsLayerConfig, DefaultedLabelsLayerConfigKeys>
> &
  Omit<RawLabelsLayerConfig, DefaultedLabelsLayerConfigKeys>;

export function createLabelsLayerConfig(
  rawLabelsLayerConfig: RawLabelsLayerConfig,
): LabelsLayerConfig {
  return {
    ...createLayerConfig(rawLabelsLayerConfig),
    flip: false,
    transform: {
      scale: 1,
      rotation: 0,
      translation: { x: 0, y: 0 },
    },
    ...rawLabelsLayerConfig,
  };
}
