export type ImageProviderConfig = unknown;

export type ImageData = {
  name: string;
  tileSource: unknown;
};

export interface ImageProvider {
  getData(): ImageData;
}

export type ImageProviderFactory = (
  config: ImageProviderConfig,
) => ImageProvider;

/** Image settings */
export type ImageSettings = {
  /** Visibiliy of the image */
  visbility: boolean;

  // TODO implement filters
};

/** A named two-dimensional single-channel single-timepoint grayscale or RGB image */
export type Image = {
  /** Human-readable image name */
  name: string;

  /** Data provider configuration */
  data: { type: string; config: ImageProviderConfig };

  /** Image settings */
  settings: ImageSettings;
};

export const defaultImageSettings: ImageSettings = {
  visbility: true,
};

export default Image;
