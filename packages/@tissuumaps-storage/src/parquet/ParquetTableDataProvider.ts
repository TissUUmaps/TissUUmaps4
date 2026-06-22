import type { ProgressCallback, TableDataProvider } from "@tissuumaps/core";

import { ParquetTableData } from "./ParquetTableData";
import {
  type ParquetTableDataSource,
  createDefaultParquetTableDataSource,
} from "./ParquetTableDataSource";
import { runParquetWorker } from "./runParquetWorker";

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

    let source: {
      file?: File;
      url?: string;
      headers?: { [header: string]: string };
    };
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      source = { file: await fh.getFile() };
      signal?.throwIfAborted();
    } else if (defaultDataSource.url !== undefined) {
      source = {
        url: defaultDataSource.url,
        headers: defaultDataSource.requestHeaders,
      };
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    const { numRows, columnNames, ids, names } = await runParquetWorker(
      {
        op: "open",
        ...source,
        idColumn: defaultDataSource.idColumn,
        nameColumn: defaultDataSource.nameColumn,
      },
      { signal },
    );

    return new ParquetTableData(source, numRows, columnNames, ids, names);
  }
}
