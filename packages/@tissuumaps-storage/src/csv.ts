import * as papaparse from "papaparse";

import {
  type MappableArrayLike,
  type RawTableDataSource,
  type TableData,
  type TableDataSource,
  type TypedArray,
  createTableDataSource,
} from "@tissuumaps/core";

import { AbstractTableDataLoader } from "./base";

export const csvTableDataSourceType = "csv";
export const csvTableDataSourceDefaults = {
  chunkSize: 10000,
  parseConfig: {
    delimiter: ",",
  },
};

export interface RawCSVTableDataSource extends RawTableDataSource<
  typeof csvTableDataSourceType
> {
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

export type CSVTableDataSource = TableDataSource<
  typeof csvTableDataSourceType
> &
  Required<
    Pick<RawCSVTableDataSource, keyof typeof csvTableDataSourceDefaults>
  > &
  Omit<
    RawCSVTableDataSource,
    | keyof TableDataSource<typeof csvTableDataSourceType>
    | keyof typeof csvTableDataSourceDefaults
  >;

export function createCSVTableDataSource(
  rawCSVTableDataSource: RawCSVTableDataSource,
): CSVTableDataSource {
  return {
    ...createTableDataSource(rawCSVTableDataSource),
    ...csvTableDataSourceDefaults,
    ...rawCSVTableDataSource,
  };
}

export class CSVTableDataLoader extends AbstractTableDataLoader<
  CSVTableDataSource,
  CSVTableData
> {
  async loadTable({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<CSVTableData> {
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
    { signal }: { signal?: AbortSignal } = {},
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
