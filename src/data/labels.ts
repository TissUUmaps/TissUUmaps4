import { ILabelsDataSourceModel } from "../models/labels";
import { IData, IDataLoader } from "./base";
import { CustomTileSource, IntArray, UintArray } from "./types";

export interface ILabelsData extends IData {
  readonly labelIds: IntArray | UintArray;
  readonly labelsTileSource: string | CustomTileSource;
}

export interface ILabelsDataLoader extends IDataLoader {
  loadLabels: (
    dataSource: ILabelsDataSourceModel<string>,
  ) => Promise<ILabelsData>;
}
