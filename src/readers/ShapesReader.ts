export type GeoJSON = object;

export default interface ShapesReader {
  read(): Promise<GeoJSON>;
}

export interface ShapesReaderOptions<T extends string> {
  type: T;
}

export type ShapesReaderFactory<T extends string> = (
  options: ShapesReaderOptions<T>,
) => ShapesReader | undefined;
