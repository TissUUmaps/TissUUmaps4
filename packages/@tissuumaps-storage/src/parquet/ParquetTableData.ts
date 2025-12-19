import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import { type MappableArrayLike, type TableData } from "@tissuumaps/core";

export class ParquetTableData implements TableData {
  private readonly _buffer: hyparquet.AsyncBuffer;
  private readonly _metadata: hyparquet.FileMetaData;
  private readonly _columns: string[];

  constructor(buffer: hyparquet.AsyncBuffer, metadata: hyparquet.FileMetaData) {
    this._buffer = buffer;
    this._metadata = metadata;
    this._columns = hyparquet
      .parquetSchema(metadata)
      .children.map((c) => c.element.name);
  }

  getLength(): number {
    return Number(this._metadata.num_rows);
  }

  getColumns(): string[] {
    return this._columns;
  }

  async loadColumn<T>(
    column: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<MappableArrayLike<T>> {
    signal?.throwIfAborted();
    const data = await parquetReadColumn({
      file: this._buffer,
      columns: [column],
      metadata: this._metadata,
      compressors: compressors,
    });
    signal?.throwIfAborted();
    return Array.from(data) as MappableArrayLike<T>;
  }

  destroy(): void {}
}
