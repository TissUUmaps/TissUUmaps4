import { type ProgressCallback, type UintArray } from "../types";
import { type DataLoader, type ItemsData } from "./base";

/**
 * Data loader for label images
 *
 * @typeParam TLabelsData - The concrete {@link LabelsData} type produced by this loader
 */
export interface LabelsDataLoader<
  TLabelsData extends LabelsData,
> extends DataLoader {
  /**
   * Loads the labels data from the configured data source
   *
   * @param options - Optional abort signal and progress callback
   * @returns The loaded labels data
   */
  loadLabels(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<TLabelsData>;
}

/**
 * Loaded label image data providing a tiled, multi-resolution integer raster
 *
 * Each pixel value represents a label (segment) ID.
 */
export interface LabelsData extends ItemsData {
  /**
   * Returns the full labels image width in pixels
   *
   * @param level - Pyramid level (defaults to the highest resolution)
   */
  getWidth(level?: number): number;

  /**
   * Returns the full labels image height in pixels
   *
   * @param level - Pyramid level (defaults to the highest resolution)
   */
  getHeight(level?: number): number;

  /** Returns the number of pyramid levels */
  getLevelCount(): number;

  /**
   * Returns the scale factor for a given pyramid level relative to the
   * highest resolution
   *
   * @param level - Pyramid level
   */
  getLevelScale(level: number): number;

  /**
   * Returns the tile width for a given pyramid level
   *
   * @param level - Pyramid level
   */
  getTileWidth(level: number): number;

  /**
   * Returns the tile height for a given pyramid level
   *
   * @param level - Pyramid level
   */
  getTileHeight(level: number): number;

  /**
   * Loads a single tile as an unsigned integer array
   *
   * @param level - Pyramid level
   * @param x - Tile column index
   * @param y - Tile row index
   * @param options - Optional abort signal and progress callback
   */
  loadTile(
    level: number,
    x: number,
    y: number,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<UintArray>;
}
