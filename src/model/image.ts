import { ImageProviderConfig } from "../utils/IOUtils";

/** Image settings */
export interface ImageSettings {
  /** Visibiliy of the image */
  visbility: boolean;

  // TODO implement filters
}

/** A named two-dimensional single-channel single-timepoint grayscale or RGB image */
export default interface Image {
  /** Human-readable image name */
  name: string;

  /** Data provider configuration */
  data: { type: string; config: ImageProviderConfig };

  /** Image settings */
  settings: ImageSettings;
}

export const defaultImageSettings: ImageSettings = {
  visbility: true,
};
