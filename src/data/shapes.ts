import { IData, IDataLoader } from "./base";
import { GeoJSONGeometry } from "./types";

export interface IShapesData extends IData {
  getLength(): number;
  loadGeometries(): Promise<GeoJSONGeometry[]>;
}

export interface IShapesDataLoader<TShapesData extends IShapesData>
  extends IDataLoader {
  loadShapes: () => Promise<TShapesData>;
}
