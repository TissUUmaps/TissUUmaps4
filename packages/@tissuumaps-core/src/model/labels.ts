import {
  type ItemsDataSource,
  type RawItemsDataSource,
  type RawSingleLayerDataObject,
  type SingleLayerDataObject,
  createItemsDataSource,
  createSingleLayerDataObject,
} from "./base";
import type { ColorConfig, OpacityConfig, VisibilityConfig } from "./configs";
import {
  defaultLabelColorPalette,
  defaultLabelOpacity,
  defaultLabelVisibility,
} from "./constants";

/**
 * Default values for {@link RawLabels}
 */
export const labelsDefaults = {
  labelColor: { random: { palette: defaultLabelColorPalette } },
  labelVisibility: { constant: { value: defaultLabelVisibility } },
  labelOpacity: { constant: { value: defaultLabelOpacity } },
} as const satisfies Partial<RawLabels>;

/**
 * A two-dimensional label mask
 */
export interface RawLabels extends RawSingleLayerDataObject<
  RawLabelsDataSource<string>
> {
  /**
   * Label color
   *
   * @defaultValue {@link labelsDefaults.labelColor}
   */
  labelColor?: ColorConfig;

  /**
   * Label visibility
   *
   * @defaultValue {@link labelsDefaults.labelVisibility}
   */
  labelVisibility?: VisibilityConfig;

  /**
   * Label opacity
   *
   * @defaultValue {@link labelsDefaults.labelOpacity}
   */
  labelOpacity?: OpacityConfig;
}

/**
 * A {@link RawLabels} with {@link labelsDefaults} applied
 */
export type Labels = SingleLayerDataObject<LabelsDataSource<string>> &
  Required<Pick<RawLabels, keyof typeof labelsDefaults>> &
  Omit<RawLabels, keyof typeof labelsDefaults>;

/**
 * Creates a {@link Labels} from a {@link RawLabels} by applying {@link labelsDefaults}
 *
 * @param rawLabels - The raw labels
 * @returns The complete labels with default values applied
 */
export function createLabels(rawLabels: RawLabels): Labels {
  return {
    ...createSingleLayerDataObject(rawLabels),
    ...structuredClone(labelsDefaults),
    ...structuredClone(rawLabels),
    dataSource: createLabelsDataSource(rawLabels.dataSource),
  };
}

/**
 * Default values for {@link RawLabelsDataSource}
 */
export const labelsDataSourceDefaults = {} as const satisfies Partial<
  RawLabelsDataSource<string>
>;

/**
 * A data source for two-dimensional label masks
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawLabelsDataSource<
  TType extends string = string,
> extends RawItemsDataSource<TType> {}

/**
 * A {@link RawLabelsDataSource} with {@link labelsDataSourceDefaults} applied
 */
export type LabelsDataSource<TType extends string = string> =
  ItemsDataSource<TType> &
    Required<
      Pick<RawLabelsDataSource<TType>, keyof typeof labelsDataSourceDefaults>
    > &
    Omit<RawLabelsDataSource<TType>, keyof typeof labelsDataSourceDefaults>;

/**
 * Creates a {@link LabelsDataSource} from a {@link RawLabelsDataSource} by applying {@link labelsDataSourceDefaults}
 *
 * @param rawLabelsDataSource - The raw labels data source
 * @returns The complete labels data source with default values applied
 */
export function createLabelsDataSource<TType extends string>(
  rawLabelsDataSource: RawLabelsDataSource<TType>,
): LabelsDataSource<TType> {
  return {
    ...createItemsDataSource(rawLabelsDataSource),
    ...structuredClone(labelsDataSourceDefaults),
    ...structuredClone(rawLabelsDataSource),
  };
}
