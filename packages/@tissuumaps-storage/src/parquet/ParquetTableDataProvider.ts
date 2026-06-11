import {
  type ProgressCallback,
  type TableDataProvider,
} from "@tissuumaps/core";

import { ParquetTableData } from "./ParquetTableData";
import {
  type ParquetTableDataSource,
  createDefaultParquetTableDataSource,
} from "./ParquetTableDataSource";
import { ParquetWorkerClient } from "./ParquetWorkerClient";
import ParquetWorker from "./parquet.worker.ts?worker&inline";
import { type ParquetSource } from "./parquetProtocol";

export class ParquetTableDataProvider implements TableDataProvider<
  ParquetTableDataSource,
  ParquetTableData
> {
  readonly name = "Parquet";

  readonly schema = {
    type: "object",
    properties: {
      url: {
        type: "string",
      },
      // TODO path
      idColumn: {
        type: "string",
      },
      nameColumn: {
        type: "string",
      },
    },
    required: ["url"], // TODO ... or path
  };

  readonly uischema = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Control",
        scope: "#/properties/url",
        label: "URL",
      },
      // TODO path
      {
        type: "Control",
        scope: "#/properties/idColumn",
        label: "ID Column",
      },
      {
        type: "Control",
        scope: "#/properties/nameColumn",
        label: "Name Column",
      },
    ],
  };

  async open(
    dataSource: ParquetTableDataSource,
    options?: {
      signal?: AbortSignal;
      onProgress?: ProgressCallback;
      workspace?: FileSystemDirectoryHandle | null;
    },
  ): Promise<ParquetTableData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    const defaultDataSource = createDefaultParquetTableDataSource(dataSource);

    // Acquire the source on the main thread, but do all hyparquet decoding in
    // the worker: a local file is read and its ArrayBuffer transferred; a remote
    // URL is fetched (with range requests) inside the worker.
    let source: ParquetSource;
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const buffer = await file.arrayBuffer();
      signal?.throwIfAborted();
      source = { kind: "buffer", buffer };
    } else if (defaultDataSource.url !== undefined) {
      source = {
        kind: "url",
        url: defaultDataSource.url,
        requestHeaders: defaultDataSource.requestHeaders,
      };
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    const client = new ParquetWorkerClient(new ParquetWorker());
    try {
      const result = await client.open(source, {
        idColumn: defaultDataSource.idColumn,
        nameColumn: defaultDataSource.nameColumn,
        signal,
      });
      signal?.throwIfAborted();
      return new ParquetTableData(client, result);
    } catch (error) {
      client.close();
      throw error;
    }
  }
}
