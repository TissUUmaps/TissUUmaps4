import type { ImageDataSource } from "../model/image";
import type { Color } from "../model/primitives";
import type { Data, DataProvider } from "./base";

/**
 * Data provider for raster images
 *
 * @typeParam TImageDataSource - The data source type this data provider opens
 * @typeParam TImageData - The {@link ImageData} type produced by this data
 * provider
 * @typeParam TNormalizedImageDataSource - The normalized data source type
 * produced by `normalize` and accepted by `load`
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageDataProvider<
  TImageDataSource extends ImageDataSource,
  TImageData extends ImageData,
  TNormalizedImageDataSource extends TImageDataSource = TImageDataSource,
> extends DataProvider<
  TImageDataSource,
  TImageData,
  TNormalizedImageDataSource
> {}

/**
 * Loaded image data providing one or more OpenSeadragon-compatible tile sources
 *
 * Image data is either multi-channel, in which case it provides one tile source
 * per channel, addressed by channel index; or it is not, in which case it
 * provides a single tile source that is not addressed by channel.
 * {@link ImageData.getSizeC} returns `undefined` for image data that is not multi-channel.
 */
export interface ImageData extends Data {
  /** Returns the number of channels in the image, or undefined if not multi-channel */
  getSizeC(): number | undefined;

  /**
   * Returns the tile source of a channel, or the only tile source of image data that is not multi-channel
   *
   * @param c - The channel index (0-based), required for multi-channel image
   * data and to be omitted otherwise
   * @returns The tile source, which can be a URL string, a TileSourceConfig
   * object, or a CustomTileSource object
   * @throws Error if `c` is omitted for multi-channel image data, if `c` is
   * passed for image data that is not multi-channel, or if `c` is out of bounds
   */
  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource;

  /** Returns the name of a specific channel, or undefined if not multi-channel */
  getChannelName?: (c: number) => string | undefined;

  /** Returns the visibility of a specific channel, or undefined if not multi-channel or not available */
  getChannelVisibility?: (c: number) => boolean | undefined;

  /** Returns the opacity of a specific channel, or undefined if not multi-channel or not available */
  getChannelOpacity?: (c: number) => number | undefined;

  /** Returns the color of a specific channel, or undefined if not multi-channel or not available */
  getChannelColor?: (c: number) => Color | undefined;
}

/** Configuration object accepted by OpenSeadragon as a tile source */
export type TileSourceConfig = object;

/** A custom tile source that resolves tile URLs programmatically */
export interface CustomTileSource {
  /**
   * Returns the URL for a specific tile
   *
   * @param level - Pyramid level
   * @param x - Tile column index
   * @param y - Tile row index
   * @returns The tile URL, or a function that returns the URL
   */
  getTileUrl(level: number, x: number, y: number): string | (() => string);
}
