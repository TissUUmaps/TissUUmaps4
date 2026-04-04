import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import {
  type ProgressCallback,
  type TableDataProvider,
} from "@tissuumaps/core";

import { ParquetTableData } from "./ParquetTableData";
import {
  type ParquetTableDataSource,
  createDefaultParquetTableDataSource,
} from "./ParquetTableDataSource";

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
    },
    required: ["url"], // TODO ... or path
  };

  readonly uiSchema = {
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

    let buffer;
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      buffer = await file.arrayBuffer();
      signal?.throwIfAborted();
    } else if (defaultDataSource.url !== undefined) {
      buffer = await hyparquet.asyncBufferFromUrl({
        url: defaultDataSource.url,
        requestInit: { headers: defaultDataSource.requestHeaders },
      });
      signal?.throwIfAborted();
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    const metadata = await hyparquet.parquetMetadataAsync(buffer);
    signal?.throwIfAborted();

    let ids;
    if (defaultDataSource.idColumn !== undefined) {
      const rawIdColumnData = await parquetReadColumn({
        file: buffer,
        columns: [defaultDataSource.idColumn],
        metadata: metadata,
        compressors: compressors,
      });
      signal?.throwIfAborted();
      for (let i = 0; i < rawIdColumnData.length; i++) {
        if (!Number.isInteger(rawIdColumnData[i])) {
          throw new Error(
            `ID column "${defaultDataSource.idColumn}" contains non-integer values.`,
          );
        }
      }
      ids = Array.from(rawIdColumnData);
    }

    return new ParquetTableData(buffer, metadata, ids);
  }
}
