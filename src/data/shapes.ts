import { IShapesDataSourceModel } from "../models/shapes";
import { IData, IDataLoader } from "./base";
import { GeoJSONGeometry, UintArray } from "./types";

export interface IShapesData extends IData {
  getIds(): UintArray;
  getGeometries(): GeoJSONGeometry[];
}

export interface IShapesDataLoader<
  TShapesDataSourceModel extends IShapesDataSourceModel<string>,
  TShapesData extends IShapesData,
> extends IDataLoader<TShapesDataSourceModel> {
  loadShapes: (abortSignal?: AbortSignal) => Promise<TShapesData>;
}
