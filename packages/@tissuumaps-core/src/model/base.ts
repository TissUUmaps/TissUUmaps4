import { identityTransform } from "./constants";
import type { SimilarityTransform } from "./primitives";

/**
 * Default values for {@link RawModel}
 */
export const modelDefaults = {} as const satisfies Partial<RawModel>;

/**
 * Base interface for all model types in a TissUUmaps project
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawModel {}

/**
 * A {@link RawModel} with {@link modelDefaults} applied
 */
export type Model = object &
  Required<Pick<RawModel, keyof typeof modelDefaults>> &
  Omit<RawModel, keyof typeof modelDefaults>;

/**
 * Creates a {@link Model} from a {@link RawModel} by applying {@link modelDefaults}
 *
 * @param rawModel - The raw model
 * @returns The complete model with default values applied
 */
export function createModel(rawModel: RawModel): Model {
  return { ...structuredClone(modelDefaults), ...structuredClone(rawModel) };
}

/**
 * Default values for {@link RawDataObject}
 */
export const dataObjectDefaults = {} as const satisfies Partial<
  RawDataObject<RawDataSource<string>>
>;

/**
 * A named, identifiable data object backed by a data source
 */
export interface RawDataObject<
  TRawDataSource extends RawDataSource<string>,
> extends RawModel {
  /** Data object ID */
  id: string;

  /** Human-readable data object name */
  name: string;

  /** Data source */
  dataSource: TRawDataSource;
}

/**
 * A {@link RawDataObject} with {@link dataObjectDefaults} applied
 */
export type DataObject<TDataSource extends DataSource<string>> = Model &
  Required<Pick<RawDataObject<TDataSource>, keyof typeof dataObjectDefaults>> &
  Omit<RawDataObject<TDataSource>, keyof typeof dataObjectDefaults>;

/**
 * Creates a {@link DataObject} from a {@link RawDataObject} by applying {@link dataObjectDefaults}
 *
 * @param rawDataObject - The raw data object
 * @returns The complete data object with default values applied
 */
export function createDataObject<
  TType extends string,
  TRawDataSource extends RawDataSource<TType>,
>(rawDataObject: RawDataObject<TRawDataSource>): DataObject<DataSource<TType>> {
  return {
    ...createModel(rawDataObject),
    ...structuredClone(dataObjectDefaults),
    ...structuredClone(rawDataObject),
    dataSource: createDataSource(rawDataObject.dataSource),
  };
}

/**
 * Default values for {@link RawRenderedDataObject}
 */
export const renderedDataObjectDefaults = {
  visibility: true,
  opacity: 1,
  flip: false,
  transform: identityTransform,
} as const satisfies Partial<RawRenderedDataObject<RawDataSource<string>>>;

/**
 * A data object that can be rendered on one or more layers
 */
export interface RawRenderedDataObject<
  TRawDataSource extends RawDataSource<string>,
> extends RawDataObject<TRawDataSource> {
  /**
   * Layer ID
   *
   * Can be specified as:
   * - An ID of an existing Layer
   * - A table column holding the layer ID values for each item
   */
  layer: string | { column: string };

  /**
   * Data object visibility
   *
   * @defaultValue {@link renderedDataObjectDefaults.visibility}
   */
  visibility?: boolean;

  /**
   * Data object opacity, in the range [0, 1]
   *
   * @defaultValue {@link renderedDataObjectDefaults.opacity}
   */
  opacity?: number;

  /**
   * Horizontal reflection, applied before transformation
   *
   * @defaultValue {@link renderedDataObjectDefaults.flip}
   */
  flip?: boolean;

  /**
   * Transformation from data object space to layer space
   *
   * @defaultValue {@link renderedDataObjectDefaults.transform}
   */
  transform?: SimilarityTransform;
}

/**
 * A {@link RawRenderedDataObject} with {@link renderedDataObjectDefaults} applied
 */
export type RenderedDataObject<TDataSource extends DataSource<string>> =
  DataObject<TDataSource> &
    Required<
      Pick<
        RawRenderedDataObject<TDataSource>,
        keyof typeof renderedDataObjectDefaults
      >
    > &
    Omit<
      RawRenderedDataObject<TDataSource>,
      keyof typeof renderedDataObjectDefaults
    >;

/**
 * Creates a {@link RenderedDataObject} from a {@link RawRenderedDataObject} by applying {@link renderedDataObjectDefaults}
 *
 * @param rawRenderedDataObject - The raw rendered data object
 * @returns The complete rendered data object with default values applied
 */
export function createRenderedDataObject<
  TType extends string,
  TRawDataSource extends RawDataSource<TType>,
>(
  rawRenderedDataObject: RawRenderedDataObject<TRawDataSource>,
): RenderedDataObject<DataSource<TType>> {
  return {
    ...createDataObject(rawRenderedDataObject),
    ...structuredClone(renderedDataObjectDefaults),
    ...structuredClone(rawRenderedDataObject),
  };
}

/**
 * Default values for {@link RawSingleLayerDataObject}
 */
export const singleLayerDataObjectDefaults = {} as const satisfies Partial<
  RawSingleLayerDataObject<RawDataSource<string>>
>;

/**
 * A data object that can be rendered on a single layer
 */
export interface RawSingleLayerDataObject<
  TRawDataSource extends RawDataSource<string>,
> extends RawRenderedDataObject<TRawDataSource> {
  /** Layer ID */
  layer: string;
}

/**
 * A {@link RawSingleLayerDataObject} with {@link singleLayerDataObjectDefaults} applied
 */
export type SingleLayerDataObject<TDataSource extends DataSource<string>> =
  Omit<RenderedDataObject<TDataSource>, "layer"> &
    Required<
      Pick<
        RawSingleLayerDataObject<TDataSource>,
        keyof typeof singleLayerDataObjectDefaults
      >
    > &
    Omit<
      RawSingleLayerDataObject<TDataSource>,
      keyof typeof singleLayerDataObjectDefaults
    >;

/**
 * Creates a {@link SingleLayerDataObject} from a {@link RawSingleLayerDataObject} by applying {@link singleLayerDataObjectDefaults}
 *
 * @param rawSingleLayerDataObject - The raw single-layer data object
 * @returns The complete single-layer data object with default values applied
 */
export function createSingleLayerDataObject<
  TType extends string,
  TRawDataSource extends RawDataSource<TType>,
>(
  rawSingleLayerDataObject: RawSingleLayerDataObject<TRawDataSource>,
): SingleLayerDataObject<DataSource<TType>> {
  return {
    ...createRenderedDataObject(rawSingleLayerDataObject),
    ...structuredClone(singleLayerDataObjectDefaults),
    ...structuredClone(rawSingleLayerDataObject),
  };
}

/**
 * Default values for {@link RawDataSource}
 */
export const dataSourceDefaults = {} as const satisfies Partial<
  RawDataSource<string>
>;

/**
 * A data source for data objects
 */
export interface RawDataSource<TType extends string = string> extends RawModel {
  /**
   * Data source type
   */
  type: TType;

  /**
   * Remote URL (absolute or relative to TissUUmaps root)
   */
  url?: string;

  /**
   * Local path (relative to workspace root)
   */
  path?: string;
}

/**
 * A {@link RawDataSource} with {@link dataSourceDefaults} applied
 */
export type DataSource<TType extends string = string> = Model &
  Required<Pick<RawDataSource<TType>, keyof typeof dataSourceDefaults>> &
  Omit<RawDataSource<TType>, keyof typeof dataSourceDefaults>;

/**
 * Creates a {@link DataSource} from a {@link RawDataSource} by applying {@link dataSourceDefaults}
 *
 * @param rawDataSource - The raw data source
 * @returns The complete data source with default values applied
 */
export function createDataSource<TType extends string>(
  rawDataSource: RawDataSource<TType>,
): DataSource<TType> {
  return {
    ...createModel(rawDataSource),
    ...structuredClone(dataSourceDefaults),
    ...structuredClone(rawDataSource),
  };
}

/**
 * Default values for {@link RawItemsDataSource}
 */
export const itemsDataSourceDefaults = {} as const satisfies Partial<
  RawItemsDataSource<string>
>;

/**
 * A data source for data objects backed by tabular data
 */
export interface RawItemsDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {
  /** ID of the table holding the per-item values of this data source, if any */
  table?: string;
}

/**
 * A {@link RawItemsDataSource} with {@link itemsDataSourceDefaults} applied
 */
export type ItemsDataSource<TType extends string = string> = DataSource<TType> &
  Required<
    Pick<RawItemsDataSource<TType>, keyof typeof itemsDataSourceDefaults>
  > &
  Omit<RawItemsDataSource<TType>, keyof typeof itemsDataSourceDefaults>;

/**
 * Creates an {@link ItemsDataSource} from a {@link RawItemsDataSource} by applying {@link itemsDataSourceDefaults}
 *
 * @param rawItemsDataSource - The raw items data source
 * @returns The complete items data source with default values applied
 */
export function createItemsDataSource<TType extends string>(
  rawItemsDataSource: RawItemsDataSource<TType>,
): ItemsDataSource<TType> {
  return {
    ...createDataSource(rawItemsDataSource),
    ...structuredClone(itemsDataSourceDefaults),
    ...structuredClone(rawItemsDataSource),
  };
}
