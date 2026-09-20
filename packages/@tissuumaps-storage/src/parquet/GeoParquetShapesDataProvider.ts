import {
  type DataProviderLoadOptions,
  type ShapesData,
  type ShapesDataProvider,
  ShapesUtils,
  SourceUtils,
} from "@tissuumaps/core";

import {
  type GeoParquetShapesDataSource,
  type NormalizedGeoParquetShapesDataSource,
  geoParquetShapesDataSourceDefaults,
} from "./GeoParquetShapesDataSource";
import { runParquetWorker } from "./runParquetWorker";

export class GeoParquetShapesDataProvider implements ShapesDataProvider<
  GeoParquetShapesDataSource,
  ShapesData,
  NormalizedGeoParquetShapesDataSource
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
    dataSource: GeoParquetShapesDataSource,
    workspace: FileSystemDirectoryHandle | null,
    projectSource: string | null,
  ): NormalizedGeoParquetShapesDataSource {
    return {
      ...geoParquetShapesDataSourceDefaults,
      ...dataSource,
      source: SourceUtils.normalizeSource(
        dataSource.source,
        workspace,
        projectSource,
      ),
    };
  }

  async load(
    normalizedDataSource: NormalizedGeoParquetShapesDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<ShapesData> {
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
    return ShapesUtils.createShapesData(geometry, ids, names);
  }
}
