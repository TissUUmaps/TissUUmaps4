import { IDataSourceModel } from "../models/base";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IData {}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IDataLoader {}

export abstract class DataLoaderBase<
  TDataSourceModel extends IDataSourceModel<string>,
> implements IDataLoader
{
  protected readonly dataSource: TDataSourceModel;
  protected readonly projectDir: FileSystemDirectoryHandle | null;

  constructor(
    dataSource: TDataSourceModel,
    projectDir: FileSystemDirectoryHandle | null,
  ) {
    this.dataSource = dataSource;
    this.projectDir = projectDir;
  }
}
