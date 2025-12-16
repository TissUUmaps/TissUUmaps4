import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import {
  type MappableArrayLike,
  type RawTableDataSource,
  type TableData,
  type TableDataSource,
  createTableDataSource,
} from "@tissuumaps/core";

import { AbstractTableDataLoader } from "./base";

export const parquetTableDataSourceType = "parquet";
export const parquetTableDataSourceDefaults = {};

export interface RawParquetTableDataSource extends RawTableDataSource<
  typeof parquetTableDataSourceType
> {
  headers?: { [headerName: string]: string };
}

export type ParquetTableDataSource = TableDataSource<
  typeof parquetTableDataSourceType
> &
  Required<
    Pick<RawParquetTableDataSource, keyof typeof parquetTableDataSourceDefaults>
  > &
  Omit<
    RawParquetTableDataSource,
    | keyof TableDataSource<typeof parquetTableDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof parquetTableDataSourceDefaults
  >;

export function createParquetTableDataSource(
  rawParquetTableDataSource: RawParquetTableDataSource,
): ParquetTableDataSource {
  return {
    ...createTableDataSource(rawParquetTableDataSource),
    ...parquetTableDataSourceDefaults,
    ...rawParquetTableDataSource,
  };
}

export class ParquetTableDataLoader extends AbstractTableDataLoader<
  ParquetTableDataSource,
  ParquetTableData
> {
  async loadTable({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<ParquetTableData> {
    signal?.throwIfAborted();
    const buffer = await this._loadParquet({ signal });
    signal?.throwIfAborted();
    const metadata = await hyparquet.parquetMetadataAsync(buffer);
    signal?.throwIfAborted();
    return new ParquetTableData(buffer, metadata);
  }

  private async _loadParquet({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<hyparquet.AsyncBuffer> {
    signal?.throwIfAborted();
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const buffer = await file.arrayBuffer();
      signal?.throwIfAborted();
      return buffer;
    }
    if (this.dataSource.url !== undefined) {
      const buffer = await hyparquet.asyncBufferFromUrl({
        url: this.dataSource.url,
        requestInit: { headers: this.dataSource.headers },
      });
      signal?.throwIfAborted();
      return buffer;
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}

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
