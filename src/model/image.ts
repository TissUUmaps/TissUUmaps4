import { ImageReaderOptions } from "../readers/ImageReader";

/** A named two-dimensional single-channel single-timepoint grayscale or RGB image */
export type Image = {
  /** Human-readable image name */
  name: string;

  /** Layers in which to show the image */
  layers: string[];

  /** Image reader configuration */
  data: ImageReaderOptions<string>;

  /** Physical pixel size, in arbitrary unit */
  pixelSize: number;

  /** Visibility */
  visbility: boolean;

  /** Opacity, between 0 and 1 */
  opacity: number;
};

export const imageDefaults: Omit<Image, "name" | "layers" | "data"> = {
  pixelSize: 1.0,
  visbility: true,
  opacity: 1.0,
};

export default Image;
