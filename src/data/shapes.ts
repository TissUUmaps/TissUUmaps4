import { IData, IDataLoader } from "./base";
import { GeoJSONGeometry } from "./types";

export interface IShapesData extends IData {
  getLength(): number;
  loadGeometries(signal?: AbortSignal): Promise<GeoJSONGeometry[]>;
}

export interface IShapesDataLoader<TShapesData extends IShapesData>
  extends IDataLoader {
  loadShapes: (signal?: AbortSignal) => Promise<TShapesData>;
}
