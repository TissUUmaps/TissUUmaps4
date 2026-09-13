import type { ImageDataSource } from "../model/image";
import type { Color } from "../model/primitives";
import type {
  CustomTileSource,
  TileSourceConfig,
} from "../types/openseadragon";
import type { DataProvider, RasterData } from "./base";

/**
 * Loaded image data providing one or more OpenSeadragon-compatible tile sources
 *
 * Image data is either multi-channel, in which case it provides one tile source
 * per channel, addressed by channel index; or it is not, in which case it
 * provides a single tile source that is not addressed by channel.
 * {@link ImageData.getSizeC} returns `undefined` for image data that is not multi-channel.
 *
 * Multi-channel image data that implements {@link RasterData.getTileData}
 * provides a single sample ("grayscale value") per pixel and channel, which the
 * renderer contrast-stretches and colorizes (see
 * {@link ImageData.getChannelContrastLimits} and
 * {@link ImageData.getChannelColor}). Multi-channel image data that does not
 * implement it is free to provide grayscale or RGB tile sources per channel,
 * which are drawn as they are.
 */
export interface ImageData extends RasterData {
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

  /** Returns the name of a specific channel, or undefined if not available */
  getChannelName?: (c: number) => string | undefined;

  /** Returns the visibility of a specific channel, or undefined if not available */
  getChannelVisibility?: (c: number) => boolean | undefined;

  /** Returns the opacity of a specific channel, or undefined if not available */
  getChannelOpacity?: (c: number) => number | undefined;

  /**
   * Returns the color of a specific channel, or undefined if not available
   *
   * Channels without a color (neither configured on the image nor returned
   * here) are colorized with a default color derived from the channel index
   * (see `ImageUtils.getDefaultChannelColor`), so that multi-channel image data
   * without any color information renders as distinguishable channels rather
   * than as a single white blob. This fallback is data-agnostic: if colors are
   * available for only some channels, data providers should return suitable
   * default colors for the remaining ones themselves, so that all channels of
   * an image are colored consistently and the index-based fallback does not
   * mix with colors from image metadata.
   *
   * @param c - The channel index (0-based)
   * @returns The channel's color, or `undefined` if not available
   */
  getChannelColor?: (c: number) => Color | undefined;

  /**
   * Returns the contrast limits of a specific channel, or undefined if not available
   *
   * The renderer scales each channel value linearly between the contrast
   * limits, clamps the result to `[0, 1]` and multiplies it with the channel's
   * color. Channels without contrast limits (neither configured on the image
   * nor returned here) are stretched over the value range that the data type
   * of their channel data can hold, as returned by
   * `ImageUtils.getDataTypeRange` (the full integer range for integer typed
   * arrays, `[0, 1]` for floating-point typed arrays, `[0, 255]` for plain
   * arrays).
   *
   * @param c - The channel index (0-based)
   * @returns The channel's contrast limits, in the channel's value range, or
   * `undefined` if not available
   */
  getChannelContrastLimits?: (c: number) => [number, number] | undefined;
}

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
