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

/**
 * Default values for {@link RawImage}
 */
export const imageDefaults = {} as const satisfies Partial<RawImage>;

/**
 * A two-dimensional raster image
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawImage extends RawRenderedDataObject<
  RawImageDataSource<string>,
  RawImageLayerConfig
> {}

/**
 * A {@link RawImage} with {@link imageDefaults} applied
 */
export type Image = RenderedDataObject<
  ImageDataSource<string>,
  ImageLayerConfig
> &
  Required<Pick<RawImage, keyof typeof imageDefaults>> &
  Omit<
    RawImage,
    | keyof RenderedDataObject<ImageDataSource<string>, ImageLayerConfig>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof imageDefaults
  >;

/**
 * Creates a {@link Image} from a {@link RawImage} by applying {@link imageDefaults}
 *
 * @param rawImage - The raw image
 * @returns The complete image with default values applied
 */
export function createImage(rawImage: RawImage): Image {
  return {
    ...createRenderedDataObject(rawImage),
    ...structuredClone(imageDefaults),
    ...structuredClone(rawImage),
    dataSource: createImageDataSource(rawImage.dataSource),
    layerConfigs: rawImage.layerConfigs?.map(createImageLayerConfig) ?? [],
  };
}

/**
 * Default values for {@link RawImageDataSource}
 */
export const imageDataSourceDefaults = {} as const satisfies Partial<
  RawImageDataSource<string>
>;

/**
 * A data source for two-dimensional raster images
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawImageDataSource<
  TType extends string = string,
> extends RawDataSource<TType> {}

/**
 * A {@link RawImageDataSource} with {@link imageDataSourceDefaults} applied
 */
export type ImageDataSource<TType extends string = string> = DataSource<TType> &
  Required<
    Pick<RawImageDataSource<TType>, keyof typeof imageDataSourceDefaults>
  > &
  Omit<
    RawImageDataSource<TType>,
    | keyof DataSource<TType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof imageDataSourceDefaults
  >;

/**
 * Creates a {@link ImageDataSource} from a {@link RawImageDataSource} by applying {@link imageDataSourceDefaults}
 *
 * @param rawImageDataSource - The raw image data source
 * @returns The complete image data source with default values applied
 */
export function createImageDataSource<TType extends string>(
  rawImageDataSource: RawImageDataSource<TType>,
): ImageDataSource<TType> {
  return {
    ...createDataSource(rawImageDataSource),
    ...structuredClone(imageDataSourceDefaults),
    ...structuredClone(rawImageDataSource),
  };
}

/**
 * Default values for {@link RawImageLayerConfig}
 */
export const imageLayerConfigDefaults =
  {} as const satisfies Partial<RawImageLayerConfig>;

/**
 * A layer-specific display configuration for two-dimensional raster images
 */
export interface RawImageLayerConfig extends RawLayerConfig {
  /**
   * Layer ID
   */
  layer: string;
}

/**
 * A {@link RawImageLayerConfig} with {@link imageLayerConfigDefaults} applied
 */
export type ImageLayerConfig = LayerConfig &
  Required<Pick<RawImageLayerConfig, keyof typeof imageLayerConfigDefaults>> &
  Omit<
    RawImageLayerConfig,
    | keyof LayerConfig
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof imageLayerConfigDefaults
  >;

/**
 * Creates a {@link ImageLayerConfig} from a {@link RawImageLayerConfig} by applying {@link imageLayerConfigDefaults}
 *
 * @param rawImageLayerConfig - The raw image layer configuration
 * @returns The complete image layer configuration with default values applied
 */
export function createImageLayerConfig(
  rawImageLayerConfig: RawImageLayerConfig,
): ImageLayerConfig {
  return {
    ...createLayerConfig(rawImageLayerConfig),
    ...structuredClone(imageLayerConfigDefaults),
    ...structuredClone(rawImageLayerConfig),
  };
}
