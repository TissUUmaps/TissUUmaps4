import { TileSource } from "openseadragon";

export type TileSourceSpec = object;

export interface ImageReader {
  getTileSource(): string | TileSourceSpec | TileSource;
}

export interface ImageReaderOptions<T extends string> {
  type: T;
}

export type ImageReaderFactory = (
  options: ImageReaderOptions<string>,
) => ImageReader;

/** Image settings */
export type ImageSettings = {
  /** Visibility */
  visbility: boolean;

  /** Opacity, between 0 and 1 */
  opacity: number;

  // TODO implement filters
};

/** A named two-dimensional single-channel single-timepoint grayscale or RGB image */
export type Image = {
  /** Human-readable image name */
  name: string;

  /** Image reader configuration */
  data: ImageReaderOptions<string>;

  /** Image settings */
  settings: ImageSettings;
};

export const defaultImageSettings: ImageSettings = {
  visbility: true,
  opacity: 1.0,
};

export default Image;
