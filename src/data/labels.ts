import { ILabelsDataSourceModel } from "../models/labels";
import { IData, IDataLoader } from "./base";
import { CustomTileSource, IntArray, UintArray } from "./types";

export interface ILabelsData extends IData {
  labels: IntArray | UintArray;
  tileSource: string | CustomTileSource;
}

export interface ILabelsDataLoader extends IDataLoader {
  loadLabels: (
    dataSource: ILabelsDataSourceModel<string>,
  ) => Promise<ILabelsData>;
}
