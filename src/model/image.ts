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

/**
 * A two-dimensional raster image
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface Image
  extends RenderedDataObject<ImageDataSource, ImageLayerConfig> {}

/**
 * {@link Image} properties that have default values
 *
 * @internal
 */
export type ImageKeysWithDefaults = RenderedDataObjectKeysWithDefaults<
  ImageDataSource,
  ImageLayerConfig
>;

/**
 * An {@link Image} with default values applied
 *
 * @internal
 */
export type CompleteImage = Required<Pick<Image, ImageKeysWithDefaults>> &
  Omit<Image, ImageKeysWithDefaults>;

/**
 * Creates a {@link CompleteImage} from an {@link Image} by applying default values
 *
 * @param image - The raw image
 * @returns The complete image with default values applied
 *
 * @internal
 */
export function completeImage(image: Image): CompleteImage {
  return { ...completeRenderedDataObject(image), ...image };
}

/**
 * A data source for two-dimensional raster images
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageDataSource<TType extends string = string>
  extends DataSource<TType> {}

/**
 * {@link ImageDataSource} properties that have default values
 *
 * @internal
 */
export type ImageDataSourceKeysWithDefaults<TType extends string = string> =
  DataSourceKeysWithDefaults<TType>;

/**
 * An {@link ImageDataSource} with default values applied
 *
 * @internal
 */
export type CompleteImageDataSource<TType extends string = string> = Required<
  Pick<ImageDataSource<TType>, ImageDataSourceKeysWithDefaults<TType>>
> &
  Omit<ImageDataSource<TType>, ImageDataSourceKeysWithDefaults<TType>>;

/**
 * Creates a {@link CompleteImageDataSource} from an {@link ImageDataSource} by applying default values
 *
 * @param imageDataSource - The raw image data source
 * @returns The complete image data source with default values applied
 *
 * @internal
 */
export function completeImageDataSource<TType extends string = string>(
  imageDataSource: ImageDataSource<TType>,
): CompleteImageDataSource<TType> {
  return { ...completeDataSource(imageDataSource), ...imageDataSource };
}

/**
 * A layer-specific display configuration for two-dimensional raster images
 */
export interface ImageLayerConfig extends LayerConfig {
  /**
   * Layer ID
   */
  layerId: string;
}

/**
 * {@link ImageLayerConfig} properties that have default values
 *
 * @internal
 */
export type ImageLayerConfigKeysWithDefaults = LayerConfigKeysWithDefaults;

/**
 * An {@link ImageLayerConfig} with default values applied
 *
 * @internal
 */
export type CompleteImageLayerConfig = Required<
  Pick<ImageLayerConfig, ImageLayerConfigKeysWithDefaults>
> &
  Omit<ImageLayerConfig, ImageLayerConfigKeysWithDefaults>;

/**
 * Creates a {@link CompleteImageLayerConfig} from an {@link ImageLayerConfig} by applying default values
 *
 * @param imageLayerConfig - The raw image layer configuration
 * @returns The complete image layer configuration with default values applied
 *
 * @internal
 */
export function completeImageLayerConfig(
  imageLayerConfig: ImageLayerConfig,
): CompleteImageLayerConfig {
  return { ...completeLayerConfig(imageLayerConfig), ...imageLayerConfig };
}
