import type { ProgressCallback, TableDataProvider } from "@tissuumaps/core";

import { ParquetTableData } from "./ParquetTableData";
import {
  type ParquetTableDataSource,
  createDefaultParquetTableDataSource,
} from "./ParquetTableDataSource";
import { ParquetWorkerClient } from "./ParquetWorkerClient";

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

    let file, url, headers;
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      file = await fh.getFile();
      signal?.throwIfAborted();
    } else if (defaultDataSource.url !== undefined) {
      url = defaultDataSource.url;
      headers = defaultDataSource.requestHeaders;
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    const worker = new ParquetWorkerClient();
    try {
      const { numRows, columnNames } = await worker.run(
        { op: "open", file, url, headers },
        { signal },
      );
      signal?.throwIfAborted();
      const idResponsePromise =
        defaultDataSource.idColumn !== undefined
          ? worker.run(
              { op: "readColumn", column: defaultDataSource.idColumn },
              { signal },
            )
          : Promise.resolve(undefined);
      const nameResponsePromise =
        defaultDataSource.nameColumn !== undefined
          ? worker.run(
              { op: "readColumn", column: defaultDataSource.nameColumn },
              { signal },
            )
          : Promise.resolve(undefined);
      const [idResponse, nameResponse] = await Promise.all([
        idResponsePromise,
        nameResponsePromise,
      ]);
      signal?.throwIfAborted();
      const ids =
        idResponse !== undefined
          ? Array.from(idResponse.data, (id) => {
              const numericId = Number(id);
              if (id === "" || !Number.isInteger(numericId)) {
                throw new Error(`ID value "${id}" is not a valid integer.`);
              }
              return numericId;
            })
          : undefined;
      const names =
        nameResponse !== undefined
          ? Array.from(nameResponse.data, String)
          : undefined;
      return new ParquetTableData(worker, numRows, columnNames, ids, names);
    } catch (error) {
      worker.terminate();
      throw error;
    }
  }
}
