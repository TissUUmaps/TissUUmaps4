import {
  type DataSource,
  type RawDataSource,
  type RawSingleLayerDataObject,
  type SingleLayerDataObject,
  createDataSource,
  createSingleLayerDataObject,
} from "./base";
import type { Color } from "./primitives";

/**
 * Default values for {@link RawImage}
 */
export const imageDefaults = {} as const satisfies Partial<RawImage>;

/**
 * A channel of a two-dimensional raster image
 *
 * Channels are only applied to multi-channel image data, as reported by the
 * image's data provider.
 */
export type Channel = {
  /**
   * Channel name, overriding the name reported by the data provider
   */
  name?: string;

  /**
   * Channel visibility
   *
   * @defaultValue `true`
   */
  visibility?: boolean;

  /**
   * Channel opacity, in the range [0, 1], multiplied with the image opacity
   *
   * @defaultValue `1`
   */
  opacity?: number;

  /**
   * Channel color, multiplied with the channel's image data
   *
   * Without a color, the channel's image data is rendered in its own colors.
   */
  color?: Color;
};

/**
 * A two-dimensional raster image
 */
export interface RawImage extends RawSingleLayerDataObject<
  RawImageDataSource<string>
> {
  /**
   * The channels of the image, indexed by channel
   *
   * Channels beyond the end of the array, and channels of images whose data is
   * not multi-channel, use the default values of {@link Channel}.
   */
  channels?: Channel[];
}

/**
 * A {@link RawImage} with {@link imageDefaults} applied
 */
export type Image = SingleLayerDataObject<ImageDataSource<string>> &
  Required<Pick<RawImage, keyof typeof imageDefaults>> &
  Omit<RawImage, keyof typeof imageDefaults>;

/**
 * Creates an {@link Image} from a {@link RawImage} by applying {@link imageDefaults}
 *
 * @param rawImage - The raw image
 * @returns The complete image with default values applied
 */
export function createImage(rawImage: RawImage): Image {
  return {
    ...createSingleLayerDataObject(rawImage),
    ...structuredClone(imageDefaults),
    ...structuredClone(rawImage),
    dataSource: createImageDataSource(rawImage.dataSource),
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
  Omit<RawImageDataSource<TType>, keyof typeof imageDataSourceDefaults>;

/**
 * Creates an {@link ImageDataSource} from a {@link RawImageDataSource} by applying {@link imageDataSourceDefaults}
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
