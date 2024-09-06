export interface ImageSettings {
  visbility: boolean;
  // TODO: filters
}

export const defaultImageSettings: ImageSettings = {
  visbility: true,
};

export interface Image {
  data: { type: string; config: unknown };
  settings: ImageSettings;
}

export default Image;
