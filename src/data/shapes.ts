import { IShapesDataSourceModel } from "../models/shapes";
import { IData, IDataLoader } from "./base";
import { GeoJSONGeometry, IntArray, UintArray } from "./types";

export interface IShapesData extends IData {
  readonly shapeIds: IntArray | UintArray;
  readonly shapeGeometries: GeoJSONGeometry[];
}

export interface IShapesDataLoader extends IDataLoader {
  loadShapes: (
    dataSource: IShapesDataSourceModel<string>,
  ) => Promise<IShapesData>;
}
