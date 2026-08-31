import type { ImageDataSource } from "../model/image";
import type { Data, DataProvider } from "./base";

/**
 * Data provider for raster images
 *
 * @typeParam TImageDataSource - The data source type this data provider opens
 * @typeParam TImageData - The {@link ImageData} type produced by this data
 * provider
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageDataProvider<
  TImageDataSource extends ImageDataSource,
  TImageData extends ImageData,
> extends DataProvider<TImageDataSource, TImageData> {}

/**
 * Loaded image data providing an OpenSeadragon-compatible tile source
 */
export interface ImageData extends Data {
  /** Returns the number of channels in the image, or undefined if not multi-channel */
  getSizeC(): number | undefined;

  /** Returns the names of the image's channels, or undefined if not multi-channel */
  getChannelNames(): string[] | undefined;

  /**
   * Returns the tile source for a specific channel, or undefined if not multi-channel
   *
   * @param c - The channel index (0-based)
   * @returns The tile source for the channel, or undefined if not multi-channel
   */
  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource;
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
