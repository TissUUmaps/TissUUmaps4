// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageSettings {}

export const defaultImageSettings: ImageSettings = {};

export interface Image {
  data: { type: string; config: unknown };
  settings: ImageSettings;
}

export default Image;
