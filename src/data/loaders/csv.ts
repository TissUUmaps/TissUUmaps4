import * as papaparse from "papaparse";

import { ITableDataSourceModel } from "../../models/table";
import { ITableData } from "../table";
import { MappableArrayLike } from "../types";
import { TableDataLoaderBase } from "./base";

export const CSV_TABLE_DATA_SOURCE = "csv";

export interface ICSVTableDataSourceModel
  extends ITableDataSourceModel<typeof CSV_TABLE_DATA_SOURCE> {
  idColumn: string;
  parseConfig?: Partial<
    papaparse.ParseRemoteConfig | papaparse.ParseLocalConfig
  >;
}

export class CSVTableData implements ITableData {
  private readonly _ids: number[];
  private readonly _columns: string[];
  private readonly _records: Record<string, unknown>[];

  constructor(
    ids: number[],
    columns: string[],
    records: Record<string, unknown>[],
  ) {
    this._ids = ids;
    this._columns = columns;
    this._records = records;
  }

  getIds(): number[] {
    return this._ids;
  }

  getColumns(): string[] {
    return this._columns;
  }

  async loadColumn<T>(column: string): Promise<MappableArrayLike<T>> {
    if (!this._columns.includes(column)) {
      throw new Error(`Column "${column}" does not exist.`);
    }
    const data = this._records.map((row) => row[column]);
    return await Promise.resolve(data as MappableArrayLike<T>);
  }

  destroy(): void {}
}

export class CSVTableDataLoader extends TableDataLoaderBase<
  ICSVTableDataSourceModel,
  CSVTableData
> {
  async loadTable(): Promise<CSVTableData> {
    const parseResult = await this._loadCSVFile();
    const records = parseResult.data as Record<string, unknown>[];
    const ids = records.map((row) => row[this.dataSource.idColumn] as number);
    const columns = parseResult.meta.fields as string[];
    return new CSVTableData(ids, columns, records);
  }

  private async _loadCSVFile(): Promise<papaparse.ParseResult<unknown>> {
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      const file = await fh.getFile();
      return await new Promise<papaparse.ParseResult<unknown>>(
        (resolve, reject) =>
          papaparse.parse(file, {
            ...this.dataSource.parseConfig,
            dynamicTyping: true,
            header: true,
            complete: resolve,
            error: reject,
          }),
      );
    }
    if (this.dataSource.url !== undefined) {
      const url = this.dataSource.url;
      return await new Promise<papaparse.ParseResult<unknown>>(
        (resolve, reject) =>
          papaparse.parse(url, {
            ...this.dataSource.parseConfig,
            download: true,
            dynamicTyping: true,
            header: true,
            complete: resolve,
            error: reject,
          }),
      );
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}
