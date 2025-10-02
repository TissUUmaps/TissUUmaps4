import * as papaparse from "papaparse";

import {
  TableDataSource,
  TableDataSourceKeysWithDefaults,
  completeTableDataSource,
} from "../../model/table";
import { MappableArrayLike, TypedArray } from "../../types";
import { TableData } from "../table";
import { AbstractTableDataLoader } from "./base";

export const CSV_TABLE_DATA_SOURCE = "csv";

export const DEFAULT_CSV_TABLE_DATA_SOURCE_CHUNK_SIZE = 10000;
export const DEFAULT_CSV_TABLE_DATA_SOURCE_PARSE_CONFIG: Exclude<
  CSVTableDataSource["parseConfig"],
  undefined
> = {
  delimiter: ",",
};

export interface CSVTableDataSource
  extends TableDataSource<typeof CSV_TABLE_DATA_SOURCE> {
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

export type CSVTableDataSourceKeysWithDefaults =
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  | TableDataSourceKeysWithDefaults<typeof CSV_TABLE_DATA_SOURCE>
  | keyof Pick<CSVTableDataSource, "chunkSize" | "parseConfig">;

export type CompleteCSVTableDataSource = Required<
  Pick<CSVTableDataSource, CSVTableDataSourceKeysWithDefaults>
> &
  Omit<CSVTableDataSource, CSVTableDataSourceKeysWithDefaults>;

export function completeCSVTableDataSource(
  csvTableDataSource: CSVTableDataSource,
): CompleteCSVTableDataSource {
  return {
    ...completeTableDataSource(csvTableDataSource),
    chunkSize: DEFAULT_CSV_TABLE_DATA_SOURCE_CHUNK_SIZE,
    parseConfig: DEFAULT_CSV_TABLE_DATA_SOURCE_PARSE_CONFIG,
    ...csvTableDataSource,
  };
}

export class CSVTableDataLoader extends AbstractTableDataLoader<
  CompleteCSVTableDataSource,
  CSVTableData
> {
  async loadTable(signal?: AbortSignal): Promise<CSVTableData> {
    signal?.throwIfAborted();
    let n = 0;
    let allColumnNames = this.dataSource.columns;
    let columnNames = this.dataSource.loadColumns ?? allColumnNames;
    let columns:
      | {
          name: string;
          index: number;
          chunks: (string[] | TypedArray)[];
          currentChunk: (string | number)[];
          isNaN: boolean;
        }[]
      | undefined;
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
        if (n % this.dataSource.chunkSize === 0) {
          for (const column of columns) {
            column.chunks.push(
              column.isNaN
                ? (column.currentChunk as string[])
                : new Float32Array(column.currentChunk as number[]),
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
              : new Float32Array(column.currentChunk as number[]),
          );
          column.currentChunk = [];
        }
        if (column.isNaN) {
          const data = column.chunks.flatMap((chunk) =>
            Array.isArray(chunk) ? chunk : Array.from(chunk, String),
          );
          columnData.push(data);
        } else {
          const data = new Float32Array(n);
          let offset = 0;
          for (const chunk of column.chunks) {
            data.set(chunk as TypedArray, offset);
            offset += chunk.length;
          }
          columnData.push(data);
        }
        column.chunks = [];
      }
      return columnData;
    };
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const columnData = await new Promise<(string[] | Float32Array)[]>(
        (resolve, reject) =>
          papaparse.parse(file, {
            ...this.dataSource.parseConfig,
            header: false,
            skipEmptyLines: true,
            step: step,
            complete: () => resolve(complete()),
            error: reject,
          }),
      );
      signal?.throwIfAborted();
      return new CSVTableData(n, columnNames!, columnData);
    }
    if (this.dataSource.url !== undefined) {
      const url = this.dataSource.url;
      const columnData = await new Promise<(string[] | Float32Array)[]>(
        (resolve, reject) =>
          papaparse.parse(url, {
            ...this.dataSource.parseConfig,
            download: true,
            header: false,
            skipEmptyLines: true,
            step: step,
            complete: () => resolve(complete()),
            error: reject,
          }),
      );
      signal?.throwIfAborted();
      return new CSVTableData(n, columnNames!, columnData);
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}

export class CSVTableData implements TableData {
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

  async loadColumn<T>(
    column: string,
    signal?: AbortSignal,
  ): Promise<MappableArrayLike<T>> {
    signal?.throwIfAborted();
    if (!this._columns.includes(column)) {
      throw new Error(`Column "${column}" does not exist.`);
    }
    const columnIndex = this._columns.indexOf(column);
    const columnData = await Promise.resolve(
      this._columnData[columnIndex]! as unknown as MappableArrayLike<T>,
    );
    signal?.throwIfAborted();
    return columnData;
  }

  destroy(): void {}
}
