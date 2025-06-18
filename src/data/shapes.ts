import { IShapesDataSourceModel } from "../models/shapes";
import { IData, IDataLoader } from "./base";
import { GeoJSONGeometry, IntArray, UintArray } from "./types";

export interface IShapesData extends IData {
  shapes: IntArray | UintArray;
  geometries: GeoJSONGeometry[];
}

export interface IShapesDataLoader extends IDataLoader {
  loadShapes: (
    dataSource: IShapesDataSourceModel<string>,
  ) => Promise<IShapesData>;
}
