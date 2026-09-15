import {
  type DataProviderLoadOptions,
  type ShapesDataProvider,
  SourceUtils,
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
      source: {
        type: "string",
      },
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
    workspace: FileSystemDirectoryHandle | null,
    projectSource: string | null,
  ): NormalizedParquetShapesDataSource {
    return {
      ...parquetShapesDataSourceDefaults,
      ...dataSource,
      source: SourceUtils.normalizeSource(
        dataSource.source,
        workspace,
        projectSource,
      ),
    };
  }

  async load(
    normalizedDataSource: NormalizedParquetShapesDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<ParquetShapesData> {
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
    const { geometryColumn, idColumn, nameColumn } = normalizedDataSource;
    const { geometry, ids, names } = await runParquetWorker(
      {
        op: "shapes",
        source: parquetSource,
        geometryColumn,
        idColumn,
        nameColumn,
      },
      { signal, onProgress },
    );
    return new ParquetShapesData(geometry, ids, names);
  }
}
