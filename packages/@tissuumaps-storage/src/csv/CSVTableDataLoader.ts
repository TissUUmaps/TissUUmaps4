import * as papaparse from "papaparse";

import { type TypedArray } from "@tissuumaps/core";

import { AbstractTableDataLoader } from "../base";
import { CSVTableData, loadCSVTableDataColumn } from "./CSVTableData";
import { type CSVTableDataSource } from "./CSVTableDataSource";

export class CSVTableDataLoader extends AbstractTableDataLoader<
  CSVTableDataSource,
  CSVTableData
> {
  async loadTable({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<CSVTableData> {
    signal?.throwIfAborted();
    const { n, columns, data } = await this._loadCSV({ signal });
    signal?.throwIfAborted();
    let index;
    if (this.dataSource.idColumn !== undefined) {
      const ids = await loadCSVTableDataColumn<number>(
        this.dataSource.idColumn,
        columns,
        data,
        { signal },
      );
      signal?.throwIfAborted();
      for (let i = 0; i < ids.length; i++) {
        if (!Number.isInteger(ids[i])) {
          throw new Error(
            `ID column "${this.dataSource.idColumn}" contains non-integer values.`,
          );
        }
      }
      index = Array.from(ids);
    }
    return new CSVTableData(n, data, columns, index);
  }

  private async _loadCSV({ signal }: { signal?: AbortSignal } = {}): Promise<{
    n: number;
    columns: string[];
    data: (string[] | Float32Array)[];
  }> {
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
    const step = (results: papaparse.ParseStepResult<string[]>) => {
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
    };
    const complete = () => {
      const data = [];
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
          const columnData = columnInfo.chunks.flatMap((chunk) =>
            Array.isArray(chunk) ? chunk : Array.from(chunk, String),
          );
          data.push(columnData);
        } else {
          const columnData = new Float32Array(n);
          let offset = 0;
          for (const chunk of columnInfo.chunks) {
            columnData.set(chunk as TypedArray, offset);
            offset += chunk.length;
          }
          data.push(columnData);
        }
        columnInfo.chunks = [];
      }
      return data;
    };
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const data = await new Promise<(string[] | Float32Array)[]>(
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
      return { n, columns: filteredColumns!, data };
    }
    if (this.dataSource.url !== undefined) {
      const url = this.dataSource.url;
      const data = await new Promise<(string[] | Float32Array)[]>(
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
      return { n, columns: filteredColumns!, data };
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}
