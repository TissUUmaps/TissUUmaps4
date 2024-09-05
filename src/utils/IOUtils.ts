export interface PointsDataProvider<T> {
  config: T;
  getVariables(): string[];
  getData(variable: string): unknown; // TODO: define return type
}

export interface ImageDataProvider<T> {
  config: T;
  getData(): unknown; // TODO: define return type
}

export interface ShapesDataProvider<T> {
  config: T;
  getData(): unknown; // TODO: define return type
}

class IOUtils {}

export default IOUtils;
