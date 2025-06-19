import { ILabelsDataSourceModel } from "../models/labels";
import { IData, IDataLoader } from "./base";
import { ICustomTileSource, IntArray, UintArray } from "./types";

export interface ILabelsData extends IData {
  readonly labelIds: IntArray | UintArray;
  readonly tileSource: string | ICustomTileSource;
}

export interface ILabelsDataLoader<
  TLabelsDataSourceModel extends ILabelsDataSourceModel<string>,
> extends IDataLoader {
  loadLabels: (dataSource: TLabelsDataSourceModel) => Promise<ILabelsData>;
}
