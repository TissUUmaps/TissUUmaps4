import { IDataSourceModel } from "../models/base";

export interface IData {
  destroy(): void;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface IDataLoader {}

export abstract class DataLoaderBase<
  TDataSourceModel extends IDataSourceModel<string>,
> implements IDataLoader
{
  protected readonly dataSource: TDataSourceModel;
  protected readonly workspace: FileSystemDirectoryHandle | null;

  constructor(
    dataSource: TDataSourceModel,
    projectDir: FileSystemDirectoryHandle | null,
  ) {
    this.dataSource = dataSource;
    this.workspace = projectDir;
  }
}
