import { type Data, type DataLoader } from "./base";

/**
 * Data loader for raster images
 *
 * @typeParam TImageData - The concrete {@link ImageData} type produced by this loader
 */
export interface ImageDataLoader<
  TImageData extends ImageData,
> extends DataLoader {
  /**
   * Loads the image data from the configured data source
   *
   * @param options - Optional abort signal
   */
  loadImage(options: { signal?: AbortSignal }): Promise<TImageData>;
}

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
