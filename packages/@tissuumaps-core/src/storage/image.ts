import type OpenSeadragon from "openseadragon";

import type { ImageDataSource } from "../model/image";
import type { Color } from "../model/primitives";
import type { NumericArray } from "../types/arrays";
import type {
  CustomTileSource,
  TileSourceConfig,
} from "../types/openseadragon";
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
 *
 * Multi-channel image data that implements {@link ImageData.getChannelData}
 * provides a single sample ("grayscale value") per pixel and channel, which the
 * renderer contrast-stretches and colorizes (see
 * {@link ImageData.getChannelContrastLimits} and
 * {@link ImageData.getChannelColor}). Multi-channel image data that does not
 * implement it is free to provide grayscale or RGB tile sources per channel,
 * which are drawn as they are.
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

  /**
   * Extracts the raw image data of a specific channel from a tile invalidation event
   *
   * Only available for multi-channel image data. The tile in `event` already
   * belongs to the channel's tile source, so `c` is redundant for the current
   * OpenSeadragon-based renderer; it is kept for consistency with the other
   * `getChannelX` methods, for renderers that cannot derive the channel index
   * from the event, and as a guard against calling this for image data that is
   * not multi-channel.
   *
   * The raster does not need to be cropped to the tile's source bounds: it may
   * cover the full tile size, as the renderer crops it when drawing.
   *
   * @param c - The channel index (0-based)
   * @param event - The tile invalidation event
   * @returns The channel's values for the invalidated tile, one per raster
   * pixel in row-major order, along with the width and height of the raster in
   * pixels
   */
  getChannelData?: (
    c: number,
    event: OpenSeadragon.TileInvalidatedEvent,
  ) => Promise<{ values: NumericArray; width: number; height: number }>;

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
   * (see `RenderUtils.getDefaultChannelColor`), so that multi-channel image data
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
   * `RenderUtils.getDataTypeRange` (the full integer range for integer typed
   * arrays, `[0, 1]` for floating-point typed arrays, `[0, 255]` for plain
   * arrays).
   *
   * @param c - The channel index (0-based)
   * @returns The channel's contrast limits, in the channel's value range, or
   * `undefined` if not available
   */
  getChannelContrastLimits?: (c: number) => [number, number] | undefined;
}
