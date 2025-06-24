import { IShapesDataSourceModel } from "../models/shapes";
import { IData, IDataLoader } from "./base";
import { GeoJSONGeometry } from "./types";

export interface IShapesData extends IData {
  getIds(): number[];
  loadGeometries(): Promise<GeoJSONGeometry[]>;
}

export interface IShapesDataLoader<
  TShapesDataSourceModel extends IShapesDataSourceModel<string>,
  TShapesData extends IShapesData,
> extends IDataLoader<TShapesDataSourceModel> {
  loadShapes: () => Promise<TShapesData>;
}
