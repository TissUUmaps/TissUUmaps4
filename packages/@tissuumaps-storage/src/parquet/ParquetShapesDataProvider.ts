import type {
  DataProviderLoadOptions,
  ShapesDataProvider,
} from "@tissuumaps/core";

import { ParquetShapesData } from "./ParquetShapesData";
import {
  type NormalizedParquetShapesDataSource,
  type ParquetShapesDataSource,
  parquetShapesDataSourceDefaults,
} from "./ParquetShapesDataSource";
import { runParquetWorker } from "./runParquetWorker";

export class ParquetShapesDataProvider implements ShapesDataProvider<
  ParquetShapesDataSource,
  ParquetShapesData,
  NormalizedParquetShapesDataSource
> {
  readonly name = "GeoParquet";

  readonly schema = {
    type: "object",
    properties: {
      url: {
        type: "string",
      },
      // TODO path
      geometryColumn: {
        type: "string",
      },
      idColumn: {
        type: "string",
      },
      nameColumn: {
        type: "string",
      },
      table: {
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
        scope: "#/properties/geometryColumn",
        label: "Geometry Column",
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
      {
        type: "Control",
        scope: "#/properties/table",
        label: "Table",
      },
    ],
  };

  normalize(
    dataSource: ParquetShapesDataSource,
    projectUrl: string | null,
  ): NormalizedParquetShapesDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, projectUrl ?? document.baseURI).href;
    }
    return { ...parquetShapesDataSourceDefaults, ...dataSource, url };
  }

  async load(
    normalizedDataSource: NormalizedParquetShapesDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<ParquetShapesData> {
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
    const { geometryColumn, idColumn, nameColumn } = normalizedDataSource;
    const { geometry, ids, names } = await runParquetWorker(
      { op: "shapes", source, geometryColumn, idColumn, nameColumn },
      { signal, onProgress },
    );
    return new ParquetShapesData(geometry, ids, names);
  }
}
