import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import { ITableDataSourceModel } from "../../models/table";
import { ITableData } from "../table";
import { MappableArrayLike } from "../types";
import { TableDataLoaderBase } from "./base";

export const PARQUET_TABLE_DATA_SOURCE = "parquet";

export interface IParquetTableDataSourceModel
  extends ITableDataSourceModel<typeof PARQUET_TABLE_DATA_SOURCE> {
  headers?: { [headerName: string]: string };
}

export class ParquetTableData implements ITableData {
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
    signal?: AbortSignal,
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

export class ParquetTableDataLoader extends TableDataLoaderBase<
  IParquetTableDataSourceModel,
  ParquetTableData
> {
  async loadTable(signal?: AbortSignal): Promise<ParquetTableData> {
    signal?.throwIfAborted();
    const buffer = await this._loadParquet(signal);
    signal?.throwIfAborted();
    const metadata = await hyparquet.parquetMetadataAsync(buffer);
    signal?.throwIfAborted();
    return new ParquetTableData(buffer, metadata);
  }

  private async _loadParquet(
    signal?: AbortSignal,
  ): Promise<hyparquet.AsyncBuffer> {
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
      let requestInit = undefined;
      if (this.dataSource.headers !== undefined) {
        requestInit = { headers: this.dataSource.headers };
      }
      const buffer = await hyparquet.asyncBufferFromUrl({
        url: this.dataSource.url,
        requestInit: requestInit,
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
