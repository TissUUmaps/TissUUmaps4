import {
  type DataSource,
  type RawDataSource,
  type RawSingleLayerDataObject,
  type SingleLayerDataObject,
  createDataSource,
  createSingleLayerDataObject,
} from "./base";

/**
 * Default values for {@link RawImage}
 */
export const imageDefaults = {} as const satisfies Partial<RawImage>;

/**
 * A channel of a two-dimensional raster image
 */
export type Channel = {
  /** The name of the channel (overrides data provider) */
  name?: string;

  /** The visibility of the channel */
  visibility?: boolean;

  /** The opacity of the channel */
  opacity?: number;
};

/**
 * A two-dimensional raster image
 */
export interface RawImage extends RawSingleLayerDataObject<
  RawImageDataSource<string>
> {
  /** The channels of the image */
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
