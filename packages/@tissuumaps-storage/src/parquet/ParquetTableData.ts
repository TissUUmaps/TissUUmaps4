import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import {
  type GenericArray,
  ParseUtils,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

export class ParquetTableData implements TableData {
  private _ids: number[] | undefined;
  private _names: string[] | undefined;
  private readonly _buffer: hyparquet.AsyncBuffer;
  private readonly _metadata: hyparquet.FileMetaData;
  private readonly _columns: string[];

  constructor(
    ids: number[] | undefined,
    names: string[] | undefined,
    buffer: hyparquet.AsyncBuffer,
    metadata: hyparquet.FileMetaData,
  ) {
    this._ids = ids;
    this._names = names;
    this._buffer = buffer;
    this._metadata = metadata;
    this._columns = hyparquet
      .parquetSchema(metadata)
      .children.map((c) => c.element.name);
  }

  getIds(): number[] {
    if (this._ids === undefined) {
      console.warn("No ID column specified, using sequential IDs instead");
      this._ids = Array.from({ length: this.getSize() }, (_, i) => i);
    }
    return this._ids;
  }

  getSize(): number {
    return ParseUtils.parseSafeInt(this._metadata.num_rows);
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
    const rawColumnData = await parquetReadColumn({
      file: this._buffer,
      columns: [column],
      metadata: this._metadata,
      compressors: compressors,
    });
    signal?.throwIfAborted();
    return Array.from(rawColumnData) as GenericArray<T>;
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

  close(): void {}
}
