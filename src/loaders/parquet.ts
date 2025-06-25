import {
  AsyncBuffer,
  FileMetaData,
  asyncBufferFromUrl,
  parquetMetadataAsync,
  parquetSchema,
} from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import { ITableData, TableDataLoaderBase } from "../data/table";
import { ITableDataSourceModel } from "../models/table";

export const PARQUET_TABLE_DATA_SOURCE = "parquet";

export interface IParquetTableDataSourceModel
  extends ITableDataSourceModel<typeof PARQUET_TABLE_DATA_SOURCE> {
  parquetUrl?: string;
  parquetFile?: string;
  idColumn: string;
  headers?: { [headerName: string]: string };
}

export class ParquetTableData implements ITableData {
  private readonly ids: number[];
  private readonly columns: string[];
  private readonly buffer: AsyncBuffer;
  private readonly metadata: FileMetaData;

  constructor(
    ids: number[],
    columns: string[],
    buffer: AsyncBuffer,
    metadata: FileMetaData,
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
}

export class ParquetTableDataLoader extends TableDataLoaderBase<
  IParquetTableDataSourceModel,
  ParquetTableData
> {
  async loadTable(): Promise<ParquetTableData> {
    const buffer = await this.loadParquet();
    const metadata = await parquetMetadataAsync(buffer);
    const idArray = await parquetReadColumn({
      file: buffer,
      columns: [this.dataSource.idColumn],
      metadata: metadata,
      compressors: compressors,
    });
    const ids = Array.from(idArray) as number[];
    const columns = parquetSchema(metadata).children.map((c) => c.element.name);
    return new ParquetTableData(ids, columns, buffer, metadata);
  }

  private async loadParquet(): Promise<AsyncBuffer> {
    if (this.dataSource.parquetUrl !== undefined) {
      let requestInit: RequestInit | undefined = undefined;
      if (this.dataSource.headers !== undefined) {
        requestInit = { headers: this.dataSource.headers };
      }
      return await asyncBufferFromUrl({
        url: this.dataSource.parquetUrl,
        requestInit: requestInit,
      });
    }
    if (this.dataSource.parquetFile !== undefined) {
      if (this.projectDir === null) {
        throw new Error("Project directory is required to load local files.");
      }
      const fh = await this.projectDir.getFileHandle(
        this.dataSource.parquetFile,
      );
      const file = await fh.getFile();
      return await file.arrayBuffer();
    }
    throw new Error("No Parquet source specified (parquetUrl or parquetFile).");
  }
}
