import * as hyparquet from "hyparquet";

import { AbstractTableDataLoader } from "../base";
import { ParquetTableData } from "./ParquetTableData";
import { type ParquetTableDataSource } from "./ParquetTableDataSource";

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
