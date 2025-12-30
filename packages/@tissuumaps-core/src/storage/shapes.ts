import { type MultiPolygon } from "../types/geometry";
import { type DataLoader, type ItemsData } from "./base";

export interface ShapesDataLoader<
  TShapesData extends ShapesData,
> extends DataLoader {
  loadShapes: (options: { signal?: AbortSignal }) => Promise<TShapesData>;
}

export interface ShapesData extends ItemsData {
  loadMultiPolygons(options: { signal?: AbortSignal }): Promise<MultiPolygon[]>;
}
