import {
  type GenericArray,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

import { runParquetWorker } from "./runParquetWorker";
import type { ParquetSource } from "./types";

export class ParquetTableData implements TableData {
  private readonly _source: ParquetSource;
  private readonly _numRows: number;
  private readonly _columnNames: string[];
  private _ids: number[] | undefined;
  private readonly _names: string[] | undefined;

  constructor(
    source: ParquetSource,
    numRows: number,
    columnNames: string[],
    ids: number[] | undefined,
    names: string[] | undefined,
  ) {
    this._source = source;
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
    const { columnData } = await runParquetWorker(
      { op: "column", source: this._source, column },
      { signal },
    );
    signal?.throwIfAborted();
    return Array.from(columnData) as GenericArray<T>;
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
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { range } = await runParquetWorker(
      { op: "range", source: this._source, column },
      { signal },
    );
    signal?.throwIfAborted();
    return range;
  }

  close(): void {}
}
