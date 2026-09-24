import {
  type GenericArray,
  MathUtils,
  type ProgressCallback,
  type TableColumnQuerySuggestion,
  type TableData,
} from "@tissuumaps/core";

import { ColumnUtils } from "./ColumnUtils";
import type { HierarchicalTable } from "./HierarchicalTable";

/** The {@link TableData} of a hierarchical table; owns the table and closes it */
export class HierarchicalTableData implements TableData {
  private readonly _table: HierarchicalTable;
  private readonly _numRows: number;
  private _ids: number[] | undefined;
  private readonly _names: string[] | undefined;

  constructor(
    table: HierarchicalTable,
    numRows: number,
    ids: number[] | undefined,
    names: string[] | undefined,
  ) {
    this._table = table;
    this._numRows = numRows;
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

  suggestColumnQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<TableColumnQuerySuggestion[]> {
    const { signal } = options ?? {};
    if (signal?.aborted) {
      return Promise.reject(signal.reason as Error);
    }
    return Promise.resolve(
      ColumnUtils.suggestColumnQueries(this._table.columns, currentQuery),
    );
  }

  resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    if (signal?.aborted) {
      return Promise.reject(signal.reason as Error);
    }
    return Promise.resolve(
      ColumnUtils.resolveColumnQuery(this._table.columns, query),
    );
  }

  // onProgress is accepted but unused: stores report no byte progress.
  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const data = await this._table.readColumn(column, {
      numRows: this._numRows,
      signal,
    });
    return data as GenericArray<T>;
  }

  async loadUniqueValueCounts<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<Map<T, number>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues<T>(column, { signal });
    return await MathUtils.computeUniqueValueCounts(values, { signal });
  }

  loadValueRange(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<[number, number] | undefined> {
    const { signal } = options ?? {};
    if (signal?.aborted) {
      return Promise.reject(signal.reason as Error);
    }
    return this._table.readRange(column, { numRows: this._numRows, signal });
  }

  close(): void {
    this._table.close();
  }
}
