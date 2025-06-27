import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import { ITableData, TableDataLoaderBase } from "../data/table";
import { ITableDataSourceModel } from "../models/table";

export const PARQUET_TABLE_DATA_SOURCE = "parquet";

export interface IParquetTableDataSourceModel
  extends ITableDataSourceModel<typeof PARQUET_TABLE_DATA_SOURCE> {
  parquetFile: { url: string } | { localPath: string };
  idColumn: string;
  headers?: { [headerName: string]: string };
}

export class ParquetTableData implements ITableData {
  private readonly ids: number[];
  private readonly columns: string[];
  private readonly buffer: hyparquet.AsyncBuffer;
  private readonly metadata: hyparquet.FileMetaData;

  constructor(
    ids: number[],
    columns: string[],
    buffer: hyparquet.AsyncBuffer,
    metadata: hyparquet.FileMetaData,
  ) {
    this.ids = ids;
    this.columns = columns;
    this.buffer = buffer;
    this.metadata = metadata;
  }

  getIds(): number[] {
    return this.ids;
  }

  getColumns(): string[] {
    return this.columns;
  }

  async loadColumnData<T>(column: string): Promise<T[]> {
    const data = await parquetReadColumn({
      file: this.buffer,
      columns: [column],
      metadata: this.metadata,
      compressors: compressors,
    });
    return Array.from(data) as T[];
  }

  destroy(): void {}
}

export class ParquetTableDataLoader extends TableDataLoaderBase<
  IParquetTableDataSourceModel,
  ParquetTableData
> {
  async loadTable(): Promise<ParquetTableData> {
    const buffer = await this.loadParquetFile();
    const metadata = await hyparquet.parquetMetadataAsync(buffer);
    const idArray = await parquetReadColumn({
      file: buffer,
      columns: [this.dataSource.idColumn],
      metadata: metadata,
      compressors: compressors,
    });
    const ids = Array.from(idArray) as number[];
    const columnSchema = hyparquet.parquetSchema(metadata);
    const columns = columnSchema.children.map((c) => c.element.name);
    return new ParquetTableData(ids, columns, buffer, metadata);
  }

  private async loadParquetFile(): Promise<hyparquet.AsyncBuffer> {
    if ("url" in this.dataSource.parquetFile) {
      let requestInit = undefined;
      if (this.dataSource.headers !== undefined) {
        requestInit = { headers: this.dataSource.headers };
      }
      return await hyparquet.asyncBufferFromUrl({
        url: this.dataSource.parquetFile.url,
        requestInit: requestInit,
      });
    }
    if (this.projectDir === null) {
      throw new Error("Project directory is required to load local files.");
    }
    const path = this.dataSource.parquetFile.localPath;
    const fh = await this.projectDir.getFileHandle(path);
    const file = await fh.getFile();
    return await file.arrayBuffer();
  }
}
