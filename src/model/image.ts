export type ImageData = {
  name: string;
  width: number;
  height: number;
  tileSource: string | object;
};

export interface ImageProvider {
  getData(): ImageData;
}

export type ImageProviderOptions = unknown;

export type ImageProviderFactory = (
  options: ImageProviderOptions,
) => ImageProvider;

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

  /** Data provider configuration */
  data: { type: string; options: ImageProviderOptions };

  /** Image settings */
  settings: ImageSettings;

  update?: boolean;
  reload?: boolean;
};

export const defaultImageSettings: ImageSettings = {
  visbility: true,
  opacity: 1.0,
};

export default Image;
