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

  constructor(buffer: hyparquet.AsyncBuffer, metadata: hyparquet.FileMetaData) {
    this._buffer = buffer;
    this._metadata = metadata;
  }

  getLength(): number {
    return Number(this._metadata.num_rows);
  }

  getColumns(): string[] {
    const columnSchema = hyparquet.parquetSchema(this._metadata);
    return columnSchema.children.map((c) => c.element.name);
  }

  async loadColumn<T>(column: string): Promise<MappableArrayLike<T>> {
    const data = await parquetReadColumn({
      file: this._buffer,
      columns: [column],
      metadata: this._metadata,
      compressors: compressors,
    });
    return Array.from(data) as MappableArrayLike<T>;
  }

  destroy(): void {}
}

export class ParquetTableDataLoader extends TableDataLoaderBase<
  IParquetTableDataSourceModel,
  ParquetTableData
> {
  async loadTable(): Promise<ParquetTableData> {
    const buffer = await this._loadParquetFile();
    const metadata = await hyparquet.parquetMetadataAsync(buffer);
    return new ParquetTableData(buffer, metadata);
  }

  private async _loadParquetFile(): Promise<hyparquet.AsyncBuffer> {
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      const file = await fh.getFile();
      return await file.arrayBuffer();
    }
    if (this.dataSource.url !== undefined) {
      let requestInit = undefined;
      if (this.dataSource.headers !== undefined) {
        requestInit = { headers: this.dataSource.headers };
      }
      return await hyparquet.asyncBufferFromUrl({
        url: this.dataSource.url,
        requestInit: requestInit,
      });
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }
}
