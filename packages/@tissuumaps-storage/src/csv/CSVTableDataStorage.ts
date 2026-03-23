import * as papaparse from "papaparse";

import { type ProgressCallback, type TypedArray } from "@tissuumaps/core";

import { AbstractTableDataStorage } from "../base";
import { CSVTableData } from "./CSVTableData";
import { type CSVTableDataSource } from "./CSVTableDataSource";

export class CSVTableDataStorage extends AbstractTableDataStorage<
  CSVTableDataSource,
  CSVTableData
> {
  async loadTable(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<CSVTableData> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { n, columns, columnValues } = await this._loadCSV({ signal });
    signal?.throwIfAborted();
    let ids;
    if (this.dataSource.idColumn !== undefined) {
      const idColumnValues = columnValues.get(this.dataSource.idColumn);
      if (idColumnValues === undefined) {
        throw new Error(
          `ID column "${this.dataSource.idColumn}" does not exist in the table.`,
        );
      }
      ids = Array.from(
        idColumnValues.map((v) => {
          if (!Number.isInteger(v)) {
            throw new Error(
              `ID column "${this.dataSource.idColumn}" contains non-integer values.`,
            );
          }
          return +v;
        }),
      );
    }
    return new CSVTableData(n, columns, columnValues, ids);
  }

  private async _loadCSV(options?: { signal?: AbortSignal }): Promise<{
    n: number;
    columns: string[];
    columnValues: Map<string, string[] | Float32Array>;
  }> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();

    let n = 0;
    let columns = this.dataSource.columns;
    let filteredColumns = this.dataSource.loadColumns ?? columns;
    let filteredColumnInfos:
      | {
          name: string;
          index: number;
          chunks: (string[] | TypedArray)[];
          currentChunk: (string | number)[];
          isNaN: boolean;
        }[]
      | undefined;
    if (columns !== undefined && filteredColumns !== undefined) {
      filteredColumnInfos = filteredColumns.map((column) => ({
        name: column,
        index: columns!.indexOf(column),
        chunks: [],
        currentChunk: [],
        isNaN: false,
      }));
    }

    const step = (
      results: papaparse.ParseStepResult<string[]>,
      parser: papaparse.Parser,
    ) => {
      if (
        columns === undefined ||
        filteredColumns === undefined ||
        filteredColumnInfos === undefined
      ) {
        columns = results.data;
        filteredColumns ??= columns;
        filteredColumnInfos = filteredColumns.map((column) => ({
          name: column,
          index: columns!.indexOf(column),
          chunks: [],
          currentChunk: [],
          isNaN: false,
        }));
      } else {
        if (results.data.length !== columns.length) {
          throw new Error(
            `Data row ${n} has ${results.data.length} values, expected ${columns.length}.`,
          );
        }
        for (const columnInfo of filteredColumnInfos) {
          const value = results.data[columnInfo.index]!;
          columnInfo.isNaN = columnInfo.isNaN || value === "" || isNaN(+value);
          columnInfo.currentChunk.push(columnInfo.isNaN ? value : +value);
        }
        n += 1;
        if (n % this.dataSource.chunkSize === 0) {
          for (const columnInfo of filteredColumnInfos) {
            columnInfo.chunks.push(
              columnInfo.isNaN
                ? (columnInfo.currentChunk as string[])
                : new Float32Array(columnInfo.currentChunk as number[]),
            );
            columnInfo.currentChunk = [];
          }
        }
      }
      if (signal?.aborted) {
        parser.abort();
      }
    };

    const complete = () => {
      const columnValues = new Map<string, string[] | Float32Array>();
      for (const columnInfo of filteredColumnInfos!) {
        if (columnInfo.currentChunk.length > 0) {
          columnInfo.chunks.push(
            columnInfo.isNaN
              ? (columnInfo.currentChunk as string[])
              : new Float32Array(columnInfo.currentChunk as number[]),
          );
          columnInfo.currentChunk = [];
        }
        if (columnInfo.isNaN) {
          const values = columnInfo.chunks.flatMap((chunkValues) =>
            Array.isArray(chunkValues)
              ? chunkValues
              : Array.from(chunkValues, String),
          );
          columnValues.set(columnInfo.name, values);
        } else {
          const values = new Float32Array(n);
          let offset = 0;
          for (const chunkValues of columnInfo.chunks) {
            values.set(chunkValues as TypedArray, offset);
            offset += chunkValues.length;
          }
          columnValues.set(columnInfo.name, values);
        }
        columnInfo.chunks = [];
      }
      return columnValues;
    };

    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const columnValues = await new Promise<
        Map<string, string[] | Float32Array>
      >((resolve, reject) =>
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
      return { n, columns: filteredColumns!, columnValues };
    }

    if (this.dataSource.url !== undefined) {
      const url = this.dataSource.url;
      const columnValues = await new Promise<
        Map<string, string[] | Float32Array>
      >((resolve, reject) =>
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
      return { n, columns: filteredColumns!, columnValues };
    }

    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }

    throw new Error("A URL or workspace path is required to load data.");
  }
}
