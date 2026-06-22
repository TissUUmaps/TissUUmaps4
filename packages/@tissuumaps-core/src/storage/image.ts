import type { ImageDataSource } from "../model/image";
import type { Data, DataProvider } from "./base";

/**
 * Data provider for raster images
 *
 * @typeParam TImageData - The concrete {@link ImageData} type produced by this data provider
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
  /** Returns a tile source descriptor for use with OpenSeadragon */
  getTileSource(): string | TileSourceConfig | CustomTileSource;
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
