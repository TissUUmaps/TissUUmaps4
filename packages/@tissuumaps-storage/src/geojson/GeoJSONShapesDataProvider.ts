import type * as geojson from "geojson";

import {
  ParseUtils,
  type ProgressCallback,
  type ShapesDataProvider,
  type ShapesGeometry,
} from "@tissuumaps/core";

import { GeoJSONShapesData } from "./GeoJSONShapesData";
import {
  type GeoJSONShapesDataSource,
  createDefaultGeoJSONShapesDataSource,
} from "./GeoJSONShapesDataSource";
import type {
  GeoJSONWorkerRequest,
  GeoJSONWorkerResponse,
  GeoJSONWorkerResponseFor,
} from "./geojson.worker";
import GeoJSONWorker from "./geojson.worker?worker&inline";

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

  async open(
    dataSource: GeoJSONShapesDataSource,
    options?: {
      signal?: AbortSignal;
      onProgress?: ProgressCallback;
      workspace?: FileSystemDirectoryHandle | null;
    },
  ): Promise<GeoJSONShapesData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    const defaultDataSource = createDefaultGeoJSONShapesDataSource(dataSource);

    const request: GeoJSONWorkerRequest = {
      op: "parse",
      idProperty: defaultDataSource.idProperty,
      nameProperty: defaultDataSource.nameProperty,
    };
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      request.file = await fh.getFile();
      signal?.throwIfAborted();
    } else if (defaultDataSource.url !== undefined) {
      request.url = defaultDataSource.url;
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    const { ids, names, geometry } = await GeoJSONShapesDataProvider._runWorker(
      request,
      { signal },
    );
    return new GeoJSONShapesData(ids, names, geometry);
  }

  private static _runWorker<TRequest extends GeoJSONWorkerRequest>(
    request: TRequest,
    options?: { signal?: AbortSignal },
  ): Promise<GeoJSONWorkerResponseFor<TRequest>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const worker = new GeoJSONWorker();
    return new Promise((resolve, reject) => {
      const onAbort = () => {
        worker.terminate();
        reject(signal!.reason as Error);
      };
      signal?.addEventListener("abort", onAbort, { once: true });
      worker.onmessage = (event: MessageEvent<GeoJSONWorkerResponse>) => {
        worker.terminate();
        signal?.removeEventListener("abort", onAbort);
        if ("error" in event.data) {
          reject(new Error(event.data.error));
        } else {
          resolve(event.data as GeoJSONWorkerResponseFor<TRequest>);
        }
      };
      worker.onerror = (event) => {
        worker.terminate();
        signal?.removeEventListener("abort", onAbort);
        reject(new Error(event.message));
      };
      worker.postMessage(request);
    });
  }
}
