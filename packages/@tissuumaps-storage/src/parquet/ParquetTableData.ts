import {
  type GenericArray,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

import { type ParquetWorkerClient } from "./ParquetWorkerClient";
import { type ParquetOpenResult } from "./parquetProtocol";

/**
 * Thin RPC client over a {@link ParquetWorkerClient}. Synchronous metadata
 * (size, ids, names, column names) is captured at open; column values are
 * decoded lazily in the worker on each `loadValues` call.
 */
export class ParquetTableData implements TableData {
  private readonly _client: ParquetWorkerClient;
  private readonly _numRows: number;
  private readonly _columns: string[];
  private _ids: number[] | undefined;
  private readonly _names: string[] | undefined;

  constructor(client: ParquetWorkerClient, open: ParquetOpenResult) {
    this._client = client;
    this._numRows = open.numRows;
    this._columns = open.columns;
    this._ids = open.ids;
    this._names = open.names;
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
    const filteredColumns = this._columns.filter((column) =>
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
    const column = this._columns.includes(query) ? query : null;
    return await Promise.resolve(column);
  }

  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const values = await this._client.loadColumn(column, { signal });
    signal?.throwIfAborted();
    return values as unknown as GenericArray<T>;
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
        const v = values[i];
        if (typeof v === "number" && Number.isFinite(v)) {
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
    this._client.close();
  }
}
