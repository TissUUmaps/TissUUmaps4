import * as papaparse from "papaparse";

import { ITableData, TableDataLoaderBase } from "../data/table";
import { ITableDataSourceModel } from "../models/table";

export const CSV_TABLE_DATA_SOURCE = "csv";

export interface ICSVTableDataSourceModel
  extends ITableDataSourceModel<typeof CSV_TABLE_DATA_SOURCE> {
  csvFile: { url: string } | { localPath: string };
  idColumn: string;
  parseConfig?: Partial<
    papaparse.ParseRemoteConfig | papaparse.ParseLocalConfig
  >;
}

export class CSVTableData implements ITableData {
  private readonly ids: number[];
  private readonly columns: string[];
  private readonly records: Record<string, unknown>[];

  constructor(
    ids: number[],
    columns: string[],
    records: Record<string, unknown>[],
  ) {
    this.ids = ids;
    this.columns = columns;
    this.records = records;
  }

  getIds(): number[] {
    return this.ids;
  }

  getColumns(): string[] {
    return this.columns;
  }

  loadColumnData<T>(column: string): Promise<T[]> {
    if (!this.columns.includes(column)) {
      throw new Error(`Column "${column}" does not exist.`);
    }
    const data = this.records.map((row) => row[column] as T);
    return Promise.resolve(data);
  }
}

export class CSVTableDataLoader extends TableDataLoaderBase<
  ICSVTableDataSourceModel,
  CSVTableData
> {
  async loadTable(): Promise<CSVTableData> {
    const parseResult = await this.loadCSVFile();
    const records = parseResult.data as Record<string, unknown>[];
    const ids = records.map((row) => row[this.dataSource.idColumn] as number);
    const columns = parseResult.meta.fields as string[];
    return new CSVTableData(ids, columns, records);
  }

  private async loadCSVFile(): Promise<papaparse.ParseResult<unknown>> {
    if ("url" in this.dataSource.csvFile) {
      const url = this.dataSource.csvFile.url;
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
    if (this.projectDir === null) {
      throw new Error("Project directory is required to load local files.");
    }
    const path = this.dataSource.csvFile.localPath;
    const fh = await this.projectDir.getFileHandle(path);
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
}
