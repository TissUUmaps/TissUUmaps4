export interface ImageDataProvider {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getData(): any; // TODO: define return type
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ImageSettings {}

export const defaultImageSettings: ImageSettings = {};

export interface Image {
  dataProvider: ImageDataProvider;
  settings: ImageSettings;
}

export default Image;
