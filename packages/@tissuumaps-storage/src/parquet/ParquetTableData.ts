import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import {
  type MappableArrayLike,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

export class ParquetTableData implements TableData {
  private readonly _buffer: hyparquet.AsyncBuffer;
  private readonly _metadata: hyparquet.FileMetaData;
  private readonly _columns: string[];
  private readonly _columnValues: Map<string, MappableArrayLike<unknown>>;
  private readonly _columnValueRanges: Map<string, [number, number]>;
  private _ids?: number[];

  constructor(
    buffer: hyparquet.AsyncBuffer,
    metadata: hyparquet.FileMetaData,
    ids?: number[],
  ) {
    this._buffer = buffer;
    this._metadata = metadata;
    this._columns = hyparquet
      .parquetSchema(metadata)
      .children.map((c) => c.element.name);
    this._columnValues = new Map();
    this._columnValueRanges = new Map();
    this._ids = ids;
  }

  getIds(): number[] {
    if (this._ids === undefined) {
      console.warn("No ID column specified, using sequential IDs instead");
      this._ids = Array.from(
        { length: Number(this._metadata.num_rows) },
        (_, i) => i,
      );
    }
    return this._ids;
  }

  getSize(): number {
    return Number(this._metadata.num_rows);
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
  ): Promise<MappableArrayLike<T>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let columnValues = this._columnValues.get(column) as
      | MappableArrayLike<T>
      | undefined;
    if (columnValues !== undefined) {
      return columnValues;
    }
    const rawColumnData = await parquetReadColumn({
      file: this._buffer,
      columns: [column],
      metadata: this._metadata,
      compressors: compressors,
    });
    signal?.throwIfAborted();
    columnValues = Array.from(rawColumnData) as MappableArrayLike<T>;
    this._columnValues.set(column, columnValues);
    return columnValues;
  }

  async loadValueRange(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<[number, number] | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let valueRange = this._columnValueRanges.get(column);
    if (valueRange !== undefined) {
      return valueRange;
    }
    const columnValues = await this.loadValues(column, { signal });
    signal?.throwIfAborted();
    if (typeof columnValues[0] === "number") {
      let vmin, vmax;
      for (let i = 0; i < columnValues.length; i++) {
        const v = columnValues[i];
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
        valueRange = [vmin, vmax];
        this._columnValueRanges.set(column, valueRange);
      }
    }
    return valueRange;
  }

  destroy(): void {}
}
