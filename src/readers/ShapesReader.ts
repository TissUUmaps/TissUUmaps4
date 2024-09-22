export type GeoJSON = object;

export default interface ShapesReader {
  read(): Promise<GeoJSON>;
}

export interface ShapesReaderOptions<T extends string> {
  type: T;
}
