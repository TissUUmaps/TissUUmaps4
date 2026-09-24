import {
  type ColumnQuerySuggestion,
  type GenericArray,
  MathUtils,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

import { runParquetWorker } from "./runParquetWorker";
import type { ParquetSource } from "./types";

export class ParquetTableData implements TableData {
  private readonly _source: ParquetSource;
  private readonly _numRows: number;
  private readonly _columns: string[];
  private _ids: number[] | undefined;
  private readonly _names: string[] | undefined;

  constructor(
    source: ParquetSource,
    numRows: number,
    columns: string[],
    ids: number[] | undefined,
    names: string[] | undefined,
  ) {
    this._source = source;
    this._numRows = numRows;
    this._columns = columns;
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

  suggestColumnQueries(currentQuery: string): Promise<ColumnQuerySuggestion[]> {
    const lowerCaseQuery = currentQuery.toLowerCase();
    const matches: string[] = [];
    const others: string[] = [];
    for (const column of this._columns) {
      if (column === currentQuery) {
        matches.unshift(column);
      } else if (column.toLowerCase().includes(lowerCaseQuery)) {
        matches.push(column);
      } else {
        others.push(column);
      }
    }
    return Promise.resolve(
      [...matches, ...others].map((query) => ({ query, terminal: true })),
    );
  }

  resolveColumnQuery(query: string): Promise<string | null> {
    if (this._columns.includes(query)) {
      return Promise.resolve(query);
    }
    const lowerCaseQuery = query.toLowerCase();
    const matches = this._columns.filter(
      (column) => column.toLowerCase() === lowerCaseQuery,
    );
    return Promise.resolve(matches.length === 1 ? matches[0]! : null);
  }

  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const { data } = await runParquetWorker(
      { op: "column", source: this._source, column },
      { signal, onProgress },
    );
    return data as GenericArray<T>;
  }

  async loadUniqueValueCounts<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<Map<T, number>> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues<T>(column, { signal, onProgress });
    return await MathUtils.computeUniqueValueCounts(values, { signal });
  }

  async loadValueRange(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<[number, number] | undefined> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const { range } = await runParquetWorker(
      { op: "range", source: this._source, column },
      { signal, onProgress },
    );
    return range;
  }

  close(): void {}
}
