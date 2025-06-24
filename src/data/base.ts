import { IDataSourceModel } from "../models/base";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IData {}

export interface IDataLoader<
  TDataSourceModel extends IDataSourceModel<string>,
> {
  getDataSource(): TDataSourceModel;
  getProjectDir(): FileSystemDirectoryHandle | undefined;
}
