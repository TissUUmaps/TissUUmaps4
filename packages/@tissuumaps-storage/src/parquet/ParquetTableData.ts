import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import { type MappableArrayLike, type TableData } from "@tissuumaps/core";

export async function loadParquetTableDataColumn<T>(
  column: string,
  buffer: hyparquet.AsyncBuffer,
  metadata: hyparquet.FileMetaData,
  { signal }: { signal?: AbortSignal } = {},
): Promise<MappableArrayLike<T>> {
  signal?.throwIfAborted();
  const data = await parquetReadColumn({
    file: buffer,
    columns: [column],
    metadata: metadata,
    compressors: compressors,
  });
  signal?.throwIfAborted();
  return Array.from(data) as MappableArrayLike<T>;
}

export class ParquetTableData implements TableData {
  private readonly _buffer: hyparquet.AsyncBuffer;
  private readonly _metadata: hyparquet.FileMetaData;
  private readonly _columns: string[];
  private _index?: number[];

  constructor(
    buffer: hyparquet.AsyncBuffer,
    metadata: hyparquet.FileMetaData,
    index?: number[],
  ) {
    this._buffer = buffer;
    this._metadata = metadata;
    this._columns = hyparquet
      .parquetSchema(metadata)
      .children.map((c) => c.element.name);
    this._index = index;
  }

  getLength(): number {
    return Number(this._metadata.num_rows);
  }

  getIndex(): number[] {
    if (this._index === undefined) {
      console.warn("No ID column specified, using sequential IDs instead");
      this._index = Array.from(
        { length: Number(this._metadata.num_rows) },
        (_, i) => i,
      );
    }
    return this._index;
  }

  suggestColumnSearchValues(currentColumnSearchValue: string): string[] {
    return this.getColumns(currentColumnSearchValue);
  }

  getColumns(searchValue: string): string[] {
    searchValue = searchValue.toLowerCase();
    return this._columns.filter((columns) =>
      columns.toLowerCase().includes(searchValue),
    );
  }

  async loadColumn<T>(
    column: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<MappableArrayLike<T>> {
    return await loadParquetTableDataColumn(
      column,
      this._buffer,
      this._metadata,
      options,
    );
  }

  destroy(): void {}
}
