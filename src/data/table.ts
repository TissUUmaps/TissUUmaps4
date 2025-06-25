import { ITableDataSourceModel } from "../models/table";
import { DataLoaderBase, IData, IDataLoader } from "./base";

export interface ITableData extends IData {
  getIds(): number[];
  getColumns(): string[];
  loadColumnData<T>(column: string): Promise<T[]>;
}

export interface ITableDataLoader<TTableData extends ITableData>
  extends IDataLoader {
  loadTable(): Promise<TTableData>;
}

export abstract class TableDataLoaderBase<
    TTableDataSourceModel extends ITableDataSourceModel<string>,
    TTableData extends ITableData,
  >
  extends DataLoaderBase<TTableDataSourceModel>
  implements ITableDataLoader<TTableData>
{
  abstract loadTable(): Promise<TTableData>;
}
