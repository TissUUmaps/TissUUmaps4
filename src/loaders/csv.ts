import Papa from "papaparse";

import { ITableData, ITableDataLoader } from "../data/table";
import { ITableDataSourceModel } from "../models/table";

export const CSV_TABLE_DATA_SOURCE = "csv";

export interface CSVTableDataSourceModel
  extends ITableDataSourceModel<typeof CSV_TABLE_DATA_SOURCE> {
  csvFile?: string;
  csvUrl?: string;
  index: string;
  config?:
    | Pick<
        Papa.ParseConfig,
        | "delimiter"
        | "newline"
        | "quoteChar"
        | "escapeChar"
        | "preview"
        | "comments"
        | "skipEmptyLines"
        | "delimitersToGuess"
        | "skipFirstNLines"
      >
    | Pick<
        Papa.ParseRemoteConfig,
        "downloadRequestHeaders" | "downloadRequestBody" | "withCredentials"
      >
    | Pick<Papa.ParseLocalConfig, "encoding">;
}

export class CSVTableData implements ITableData {
  private readonly index: number[];
  private readonly columns: string[];
  private readonly data: Record<string, unknown>[];

  constructor(
    index: number[],
    columns: string[],
    data: Record<string, unknown>[],
  ) {
    this.index = index;
    this.columns = columns;
    this.data = data;
  }

  getIndex(): number[] {
    return this.index;
  }

  getColumns(): string[] {
    return this.columns;
  }

  getColumnData(column: string): unknown[] {
    return this.data.map((row) => row[column]);
  }
}

export class CSVTableDataLoader
  implements ITableDataLoader<CSVTableDataSourceModel, CSVTableData>
{
  private readonly dataSource: CSVTableDataSourceModel;
  private readonly projectDir: FileSystemDirectoryHandle | undefined;

  constructor(
    dataSource: CSVTableDataSourceModel,
    projectDir?: FileSystemDirectoryHandle,
  ) {
    this.dataSource = dataSource;
    this.projectDir = projectDir;
  }

  getDataSource(): CSVTableDataSourceModel {
    return this.dataSource;
  }

  getProjectDir(): FileSystemDirectoryHandle | undefined {
    return this.projectDir;
  }

  async loadTable(): Promise<CSVTableData> {
    const results = await this.loadCSV();
    const data = results.data as Record<string, unknown>[];
    const index = data.map((row) => row[this.dataSource.index] as number);
    return new CSVTableData(index, results.meta.fields!, data);
  }

  private async loadCSV(): Promise<Papa.ParseResult<unknown>> {
    if (this.dataSource.csvUrl !== undefined) {
      return await new Promise<Papa.ParseResult<unknown>>((resolve, reject) =>
        Papa.parse(this.dataSource.csvUrl!, {
          ...this.dataSource.config,
          header: true,
          dynamicTyping: true,
          complete: resolve,
          error: reject,
          download: true,
        }),
      );
    }
    if (this.dataSource.csvFile !== undefined) {
      if (this.projectDir === undefined) {
        throw new Error("Project directory is required to load local files.");
      }
      const fh = await this.projectDir.getFileHandle(this.dataSource.csvFile);
      const file = await fh.getFile();
      return await new Promise<Papa.ParseResult<unknown>>((resolve, reject) =>
        Papa.parse(file, {
          ...this.dataSource.config,
          header: true,
          dynamicTyping: true,
          complete: resolve,
          error: reject,
        }),
      );
    }
    throw new Error("No CSV source specified (csvUrl or csvFile).");
  }
}
