import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import { type ProgressCallback } from "@tissuumaps/core";

import { AbstractTableDataStorage } from "../base";
import { ParquetTableData } from "./ParquetTableData";
import { type ParquetTableDataSource } from "./ParquetTableDataSource";

export class ParquetTableDataStorage extends AbstractTableDataStorage<
  ParquetTableDataSource,
  ParquetTableData
> {
  async loadTable(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<ParquetTableData> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const buffer = await this._loadParquet({ signal });
    signal?.throwIfAborted();
    const metadata = await hyparquet.parquetMetadataAsync(buffer);
    signal?.throwIfAborted();
    let ids;
    if (this.dataSource.idColumn !== undefined) {
      const rawIdColumnData = await parquetReadColumn({
        file: buffer,
        columns: [this.dataSource.idColumn],
        metadata: metadata,
        compressors: compressors,
      });
      signal?.throwIfAborted();
      for (let i = 0; i < rawIdColumnData.length; i++) {
        if (!Number.isInteger(rawIdColumnData[i])) {
          throw new Error(
            `ID column "${this.dataSource.idColumn}" contains non-integer values.`,
          );
        }
      }
      ids = Array.from(rawIdColumnData);
    }
    return new ParquetTableData(buffer, metadata, ids);
  }

  private async _loadParquet(options?: {
    signal?: AbortSignal;
  }): Promise<hyparquet.AsyncBuffer> {
    const { signal } = options ?? {};
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
        requestInit: { headers: this.dataSource.requestHeaders },
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
