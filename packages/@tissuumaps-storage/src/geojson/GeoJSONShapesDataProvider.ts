import {
  type ProgressCallback,
  type ShapesDataProvider,
} from "@tissuumaps/core";

import { GeoJSONShapesData } from "./GeoJSONShapesData";
import {
  type GeoJSONShapesDataSource,
  createDefaultGeoJSONShapesDataSource,
} from "./GeoJSONShapesDataSource";
import GeoJSONWorker from "./geojson.worker.ts?worker&inline";
import {
  type GeoJSONRequest,
  type GeoJSONResponse,
  type GeoJSONResult,
  type GeoJSONSource,
} from "./geojsonProtocol";

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

    // Acquire the source on the main thread, but parse + flatten in the worker:
    // a local file is read and its ArrayBuffer transferred; a remote URL is
    // fetched inside the worker.
    let source: GeoJSONSource;
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const buffer = await file.arrayBuffer();
      signal?.throwIfAborted();
      source = { kind: "buffer", buffer };
    } else if (defaultDataSource.url !== undefined) {
      source = { kind: "url", url: defaultDataSource.url };
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    const worker = new GeoJSONWorker();
    try {
      const result = await new Promise<GeoJSONResult>((resolve, reject) => {
        const listenerCleanup = new AbortController();
        worker.addEventListener(
          "message",
          (event: MessageEvent<GeoJSONResponse>) => {
            listenerCleanup.abort();
            const response = event.data;
            if (response.type === "error") {
              reject(new Error(response.message));
            } else {
              resolve(response.result);
            }
          },
          { signal: listenerCleanup.signal },
        );
        worker.addEventListener(
          "error",
          (event: ErrorEvent) => {
            listenerCleanup.abort();
            const reason: unknown = event.error;
            reject(reason instanceof Error ? reason : new Error(event.message));
          },
          { signal: listenerCleanup.signal },
        );
        if (signal !== undefined) {
          signal.addEventListener(
            "abort",
            () => {
              listenerCleanup.abort();
              const reason: unknown = signal.reason;
              reject(reason instanceof Error ? reason : new Error("Aborted"));
            },
            { signal: listenerCleanup.signal },
          );
        }
        const request: GeoJSONRequest = {
          source,
          idProperty: defaultDataSource.idProperty,
          nameProperty: defaultDataSource.nameProperty,
        };
        const transfer: Transferable[] =
          source.kind === "buffer" ? [source.buffer] : [];
        worker.postMessage(request, transfer);
      });
      signal?.throwIfAborted();
      return new GeoJSONShapesData(result.ids, result.names, result.geometry);
    } finally {
      worker.terminate();
    }
  }
}
