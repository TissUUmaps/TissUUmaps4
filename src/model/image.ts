export type TileSourceDef = string | object;

export interface ImageReader {
  getWidth(): number;
  getHeight(): number;
  getTileSource(): TileSourceDef;
}

export type ImageReaderOptions = object;

export type ImageReaderFactory = (options: ImageReaderOptions) => ImageReader;

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
  data: { type: string; options: ImageReaderOptions };

  /** Image settings */
  settings: ImageSettings;
};

export const defaultImageSettings: ImageSettings = {
  visbility: true,
  opacity: 1.0,
};

export default Image;
