import {
  type DataProviderLoadOptions,
  SourceUtils,
  type TableDataProvider,
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
      source: {
        type: "string",
      },
      idColumn: {
        type: "string",
      },
      nameColumn: {
        type: "string",
      },
    },
    required: ["source"],
  };

  readonly uischema = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Control",
        scope: "#/properties/source",
        label: "Source",
      },
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
    workspace: FileSystemDirectoryHandle | null,
    projectSource: string | null,
  ): NormalizedParquetTableDataSource {
    return {
      ...parquetTableDataSourceDefaults,
      ...dataSource,
      source: SourceUtils.normalizeSource(
        dataSource.source,
        workspace,
        projectSource,
      ),
    };
  }

  async load(
    normalizedDataSource: NormalizedParquetTableDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<ParquetTableData> {
    const { signal, onProgress, workspace = null } = options ?? {};
    signal?.throwIfAborted();
    const resolvedSource = await SourceUtils.resolveSource(
      normalizedDataSource.source,
      workspace,
      { signal },
    );
    let file, url, headers;
    if (typeof resolvedSource === "string") {
      url = resolvedSource;
      headers = normalizedDataSource.requestHeaders;
    } else {
      file = await resolvedSource.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
    }
    const parquetSource = { file, url, headers };
    const { idColumn, nameColumn } = normalizedDataSource;
    const { numRows, columns, ids, names } = await runParquetWorker(
      { op: "file", source: parquetSource, idColumn, nameColumn },
      { signal, onProgress },
    );
    return new ParquetTableData(parquetSource, numRows, columns, ids, names);
  }
}
