import type {
  DataProviderOpenOptions,
  TableDataProvider,
} from "@tissuumaps/core";

import { ParquetTableData } from "./ParquetTableData";
import {
  type NormalizedParquetTableDataSource,
  type ParquetTableDataSource,
  parquetTableDataSourceDefaults,
} from "./ParquetTableDataSource";
import { runParquetWorker } from "./runParquetWorker";

export class ParquetTableDataProvider implements TableDataProvider<
  ParquetTableDataSource,
  ParquetTableData,
  NormalizedParquetTableDataSource
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

  normalize(
    dataSource: ParquetTableDataSource,
    projectUrl: string | null,
  ): NormalizedParquetTableDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, projectUrl ?? document.baseURI).href;
    }
    return { ...parquetTableDataSourceDefaults, ...dataSource, url };
  }

  async load(
    normalizedDataSource: NormalizedParquetTableDataSource,
    options?: DataProviderOpenOptions,
  ): Promise<ParquetTableData> {
    const { signal, onProgress, workspace = null } = options ?? {};
    signal?.throwIfAborted();
    let file, url, headers;
    if (normalizedDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(normalizedDataSource.path);
      signal?.throwIfAborted(); // getFileHandle() does not throw on abort
      file = await fh.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
    } else if (normalizedDataSource.url !== undefined) {
      url = normalizedDataSource.url;
      headers = normalizedDataSource.requestHeaders;
    } else if (normalizedDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }
    const source = { file, url, headers };
    const { idColumn, nameColumn } = normalizedDataSource;
    const { numRows, columns, ids, names } = await runParquetWorker(
      { op: "file", source, idColumn, nameColumn },
      { signal, onProgress },
    );
    return new ParquetTableData(source, numRows, columns, ids, names);
  }
}
