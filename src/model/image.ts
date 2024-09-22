import { ImageReaderOptions } from "../readers/ImageReader";

/** Image settings */
export type ImageSettings = {
  /** Physical pixel size, in arbitrary unit */
  pixelSize: number;

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
  pixelSize: 1.0,
  visbility: true,
  opacity: 1.0,
};

export default Image;
