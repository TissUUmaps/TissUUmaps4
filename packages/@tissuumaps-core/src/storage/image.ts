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
   * @param c - The channel index (0-based)
   * @param event - The tile invalidation event
   * @returns The channel's values for the invalidated tile, one per tile pixel
   * in row-major order
   */
  getChannelData?: (
    c: number,
    event: OpenSeadragon.TileInvalidatedEvent,
  ) => Promise<NumericArray>;

  /** Returns the name of a specific channel, or undefined if not available */
  getChannelName?: (c: number) => string | undefined;

  /** Returns the visibility of a specific channel, or undefined if not available */
  getChannelVisibility?: (c: number) => boolean | undefined;

  /** Returns the opacity of a specific channel, or undefined if not available */
  getChannelOpacity?: (c: number) => number | undefined;

  /** Returns the color of a specific channel, or undefined if not available */
  getChannelColor?: (c: number) => Color | undefined;

  /** Returns the contrast limits of a specific channel, or undefined if not available */
  getChannelContrastLimits?: (c: number) => [number, number] | undefined;
}
