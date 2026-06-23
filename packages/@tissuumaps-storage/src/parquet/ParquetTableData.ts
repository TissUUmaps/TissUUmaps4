import {
  type GenericArray,
  ParseUtils,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

import type { ParquetWorkerClient } from "./ParquetWorkerClient";

export class ParquetTableData implements TableData {
  private readonly _worker: ParquetWorkerClient;
  private readonly _numRows: number;
  private readonly _columnNames: string[];
  private _ids: number[] | undefined;
  private _names: string[] | undefined;

  constructor(
    worker: ParquetWorkerClient,
    numRows: number,
    columnNames: string[],
    ids: number[] | undefined,
    names: string[] | undefined,
  ) {
    this._worker = worker;
    this._numRows = numRows;
    this._columnNames = columnNames;
    this._ids = ids;
    this._names = names;
  }

  getIds(): number[] {
    if (this._ids === undefined) {
      console.warn("No ID column specified, using sequential IDs instead");
      this._ids = Array.from({ length: this.getSize() }, (_, i) => i);
    }
    return this._ids;
  }

  getSize(): number {
    return this._numRows;
  }

  getNames(): string[] | undefined {
    return this._names;
  }

  async suggestColumnQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const filteredColumns = this._columnNames.filter((column) =>
      column.includes(currentQuery),
    );
    return await Promise.resolve(filteredColumns);
  }

  async resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const column = this._columnNames.includes(query) ? query : null;
    return await Promise.resolve(column);
  }

  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { data } = await this._worker.run(
      { op: "readColumn", column },
      { signal },
    );
    signal?.throwIfAborted();
    return Array.from(data) as GenericArray<T>;
  }

  async loadUniqueValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues(column, { signal, onProgress });
    signal?.throwIfAborted();
    const uniqueValues = Array.from(new Set(values));
    return await Promise.resolve(uniqueValues as GenericArray<T>);
  }

  async loadValueRange(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<[number, number] | undefined> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues(column, { signal, onProgress });
    signal?.throwIfAborted();
    if (typeof values[0] === "number") {
      let vmin, vmax;
      for (let i = 0; i < values.length; i++) {
        const v = ParseUtils.tryParseFinite(values[i]);
        if (v !== undefined) {
          if (vmin === undefined || v < vmin) {
            vmin = v;
          }
          if (vmax === undefined || v > vmax) {
            vmax = v;
          }
        }
      }
      if (vmin !== undefined && vmax !== undefined && vmin < vmax) {
        return [vmin, vmax];
      }
    }
    return undefined;
  }

  close(): void {
    this._worker.terminate();
  }
}
