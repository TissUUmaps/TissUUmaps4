export type GeoJSON = object;

export default interface ShapesReader {
  getData(): GeoJSON;
}

export interface ShapesReaderOptions<T extends string> {
  type: T;
}
