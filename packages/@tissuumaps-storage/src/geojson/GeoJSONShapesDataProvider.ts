import type {
  DataProviderOpenOptions,
  ShapesDataProvider,
} from "@tissuumaps/core";

import { GeoJSONShapesData } from "./GeoJSONShapesData";
import {
  type DefaultGeoJSONShapesDataSource,
  type GeoJSONShapesDataSource,
  geoJSONShapesDataSourceDefaults,
} from "./GeoJSONShapesDataSource";
import { runGeoJSONWorker } from "./runGeoJSONWorker";

export class GeoJSONShapesDataProvider implements ShapesDataProvider<
  GeoJSONShapesDataSource,
  GeoJSONShapesData
> {
  readonly name = "GeoJSON";

  readonly schema = {
    type: "object",
    properties: {
      url: {
        type: "string",
      },
      // TODO path
      idProperty: {
        type: "string",
      },
      nameProperty: {
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
        scope: "#/properties/idProperty",
        label: "ID Property",
      },
      {
        type: "Control",
        scope: "#/properties/nameProperty",
        label: "Name Property",
      },
      {
        type: "Control",
        scope: "#/properties/table",
        label: "Table",
      },
    ],
  };

  normalizeDataSource(
    dataSource: GeoJSONShapesDataSource,
  ): DefaultGeoJSONShapesDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, document.baseURI).href;
    }
    return { ...geoJSONShapesDataSourceDefaults, ...dataSource, url };
  }

  async load(
    dataSource: GeoJSONShapesDataSource,
    options?: DataProviderOpenOptions,
  ): Promise<GeoJSONShapesData> {
    const { signal, onProgress, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    const normalizedDataSource = this.normalizeDataSource(dataSource);

    let file, url;
    if (normalizedDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(normalizedDataSource.path);
      signal?.throwIfAborted(); // getFileHandle() does not throw on abort
      file = await fh.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
    } else if (normalizedDataSource.url !== undefined) {
      url = normalizedDataSource.url;
    } else if (normalizedDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }
    const { idProperty, nameProperty } = normalizedDataSource;
    const { ids, names, geometry } = await runGeoJSONWorker(
      { op: "file", file, url, idProperty, nameProperty },
      { signal, onProgress },
    );
    return new GeoJSONShapesData(geometry, ids, names);
  }
}
