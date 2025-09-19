import * as papaparse from "papaparse";

import { ITableDataSourceModel } from "../../models/table";
import { ITableData } from "../table";
import { MappableArrayLike, TypedArray } from "../types";
import { TableDataLoaderBase } from "./base";

export const CSV_TABLE_DATA_SOURCE = "csv";

// TODO make numeric data type configurable per column

export interface ICSVTableDataSourceModel
  extends ITableDataSourceModel<typeof CSV_TABLE_DATA_SOURCE> {
  columns?: string[];
  loadColumns?: string[];
  chunkSize?: number;
  parseConfig?: Pick<
    papaparse.ParseConfig,
    | "delimiter"
    | "newline"
    | "quoteChar"
    | "escapeChar"
    | "preview"
    | "comments"
    | "fastMode"
    | "skipFirstNLines"
  > &
    Pick<papaparse.ParseLocalConfig, "encoding"> &
    Pick<
      papaparse.ParseRemoteConfig,
      "downloadRequestHeaders" | "downloadRequestBody" | "withCredentials"
    >;
}

export class CSVTableData implements ITableData {
  private readonly _length: number;
  private readonly _columns: string[];
  private readonly _columnData: (string[] | TypedArray)[];

  constructor(
    length: number,
    columns: string[],
    columnData: (string[] | TypedArray)[],
  ) {
    this._length = length;
    this._columns = columns;
    this._columnData = columnData;
  }

  getLength(): number {
    return this._length;
  }

  getColumns(): string[] {
    return this._columns;
  }

  async loadColumn<T>(column: string): Promise<MappableArrayLike<T>> {
    if (!this._columns.includes(column)) {
      throw new Error(`Column "${column}" does not exist.`);
    }
    const columnIndex = this._columns.indexOf(column);
    return await Promise.resolve(
      this._columnData[columnIndex]! as unknown as MappableArrayLike<T>,
    );
  }

  destroy(): void {}
}

export class CSVTableDataLoader extends TableDataLoaderBase<
  ICSVTableDataSourceModel,
  CSVTableData
> {
  private static readonly _DEFAULT_CHUNK_SIZE = 10000;
  private static readonly _DEFAULT_DELIMITER = ",";

  async loadTable(): Promise<CSVTableData> {
    const chunkSize =
      this.dataSource.chunkSize ?? CSVTableDataLoader._DEFAULT_CHUNK_SIZE;
    let n = 0;
    let allColumnNames = this.dataSource.columns;
    let columnNames = this.dataSource.loadColumns ?? allColumnNames;
    let columns: Column[] | undefined;
    if (allColumnNames !== undefined && columnNames !== undefined) {
      columns = columnNames.map((columnName) => ({
        name: columnName,
        index: allColumnNames!.indexOf(columnName),
        chunks: [],
        currentChunk: [],
        isNaN: false,
      }));
    }
    const step = (results: papaparse.ParseStepResult<string[]>) => {
      if (
        allColumnNames === undefined ||
        columnNames === undefined ||
        columns === undefined
      ) {
        allColumnNames = results.data;
        columnNames ??= allColumnNames;
        columns = columnNames.map((columnName) => ({
          name: columnName,
          index: allColumnNames!.indexOf(columnName),
          chunks: [],
          currentChunk: [],
          isNaN: false,
        }));
      } else {
        if (results.data.length !== allColumnNames.length) {
          throw new Error(
            `Data row ${n} has ${results.data.length} values, expected ${allColumnNames.length}.`,
          );
        }
        for (const column of columns) {
          const value = results.data[column.index]!;
          column.isNaN = column.isNaN || value === "" || isNaN(+value);
          column.currentChunk.push(column.isNaN ? value : +value);
        }
        n += 1;
        if (n % chunkSize === 0) {
          for (const column of columns) {
            column.chunks.push(
              column.isNaN
                ? (column.currentChunk as string[])
                : new Float64Array(column.currentChunk as number[]),
            );
            column.currentChunk = [];
          }
        }
      }
    };
    const complete = () => {
      const columnData = [];
      for (const column of columns!) {
        if (column.currentChunk.length > 0) {
          column.chunks.push(
            column.isNaN
              ? (column.currentChunk as string[])
              : new Float64Array(column.currentChunk as number[]),
          );
          column.currentChunk = [];
        }
        if (column.isNaN) {
          const data = column.chunks.flatMap((chunk) =>
            Array.isArray(chunk) ? chunk : Array.from(chunk, String),
          );
          columnData.push(data);
        } else {
          const data = new Float64Array(n);
          let offset = 0;
          for (const chunk of column.chunks) {
            data.set(chunk as TypedArray, offset);
            offset += chunk.length;
          }
          columnData.push(data);
        }
        column.chunks = [];
      }
      return new CSVTableData(n, columnNames!, columnData);
    };
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      const file = await fh.getFile();
      return await new Promise((resolve, reject) =>
        papaparse.parse(file, {
          ...this.dataSource.parseConfig,
          delimiter:
            this.dataSource.parseConfig?.delimiter ??
            CSVTableDataLoader._DEFAULT_DELIMITER,
          header: false,
          skipEmptyLines: true,
          step: step,
          complete: () => resolve(complete()),
          error: reject,
        }),
      );
    }
    if (this.dataSource.url !== undefined) {
      const url = this.dataSource.url;
      return await new Promise((resolve, reject) =>
        papaparse.parse(url, {
          ...this.dataSource.parseConfig,
          download: true,
          delimiter:
            this.dataSource.parseConfig?.delimiter ??
            CSVTableDataLoader._DEFAULT_DELIMITER,
          header: false,
          skipEmptyLines: true,
          step: step,
          complete: () => resolve(complete()),
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

type Column = {
  name: string;
  index: number;
  chunks: (string[] | TypedArray)[];
  currentChunk: (string | number)[];
  isNaN: boolean;
};
