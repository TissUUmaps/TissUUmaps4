import { type MultiPolygon } from "../types";
import { type Data, type DataLoader } from "./base";

export interface ShapesDataLoader<
  TShapesData extends ShapesData,
> extends DataLoader {
  loadShapes: (options: { signal?: AbortSignal }) => Promise<TShapesData>;
}

export interface ShapesData extends Data {
  getLength(): number;
  loadMultiPolygons(options: { signal?: AbortSignal }): Promise<MultiPolygon[]>;
}
