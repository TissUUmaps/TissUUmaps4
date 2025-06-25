import {
  ParseLocalConfig,
  ParseRemoteConfig,
  ParseResult,
  parse,
} from "papaparse";

import { ITableData, TableDataLoaderBase } from "../data/table";
import { ITableDataSourceModel } from "../models/table";

export const CSV_TABLE_DATA_SOURCE = "csv";

export interface ICSVTableDataSourceModel
  extends ITableDataSourceModel<typeof CSV_TABLE_DATA_SOURCE> {
  csvUrl?: string;
  csvFile?: string;
  idColumn: string;
  config?: Partial<ParseRemoteConfig | ParseLocalConfig>;
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
    const results = await this.loadCSV();
    const records = results.data as Record<string, unknown>[];
    const ids = records.map((row) => row[this.dataSource.idColumn] as number);
    const columns = results.meta.fields as string[];
    return new CSVTableData(ids, columns, records);
  }

  private async loadCSV(): Promise<ParseResult<unknown>> {
    if (this.dataSource.csvUrl !== undefined) {
      return await new Promise<ParseResult<unknown>>((resolve, reject) =>
        parse(this.dataSource.csvUrl!, {
          ...this.dataSource.config,
          download: true,
          dynamicTyping: true,
          header: true,
          complete: resolve,
          error: reject,
        }),
      );
    }
    if (this.dataSource.csvFile !== undefined) {
      if (this.projectDir === null) {
        throw new Error("Project directory is required to load local files.");
      }
      const fh = await this.projectDir.getFileHandle(this.dataSource.csvFile);
      const file = await fh.getFile();
      return await new Promise<ParseResult<unknown>>((resolve, reject) =>
        parse(file, {
          ...this.dataSource.config,
          dynamicTyping: true,
          header: true,
          complete: resolve,
          error: reject,
        }),
      );
    }
    throw new Error("No CSV source specified (csvUrl or csvFile).");
  }
}
