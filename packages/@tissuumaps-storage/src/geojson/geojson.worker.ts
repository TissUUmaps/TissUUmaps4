import type { GeoJSON, Geometry } from "geojson";

import type { ShapesGeometry } from "@tissuumaps/core";

import { ShapesGeometryBuilder } from "../common/ShapesGeometryBuilder";

export type GeoJSONRequest<TOp extends string = string> = {
  op: TOp;
};

export type GeoJSONResponse<TRequest extends GeoJSONRequest> = {
  op: TRequest["op"];
};

export type GeoJSONFileRequest = GeoJSONRequest<"file"> & {
  file?: File;
  url?: string;
  idProperty: string | undefined;
  nameProperty: string | undefined;
};

export type GeoJSONFileResponse = GeoJSONResponse<GeoJSONFileRequest> & {
  geometry: ShapesGeometry;
  ids: number[] | undefined;
  names: string[] | undefined;
};

export type GeoJSONWorkerRequest = GeoJSONFileRequest;

export type GeoJSONWorkerResponse = GeoJSONFileResponse | { error: string };

export type GeoJSONWorkerResponseFor<
  TWorkerRequest extends GeoJSONWorkerRequest,
> = Extract<GeoJSONWorkerResponse, { op: TWorkerRequest["op"] }>;

export type GeoJSONWorkerMessage =
  GeoJSONWorkerResponse | { progress: number; total: number };

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<GeoJSONWorkerRequest>) => void) | null;
  postMessage: (
    message: GeoJSONWorkerMessage,
    transfer?: Transferable[],
  ) => void;
};

ctx.onmessage = (event) => {
  const request = event.data;
  void (async () => {
    try {
      let result;
      switch (request.op) {
        case "file":
          result = await handleFileRequest(request, (progress, total) =>
            ctx.postMessage({ progress, total }),
          );
          break;
        default:
          throw new Error("Unknown request");
      }
      ctx.postMessage(result.response, result.transfer);
    } catch (error) {
      ctx.postMessage({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
};

async function handleFileRequest(
  request: GeoJSONFileRequest,
  onProgress: (progress: number, total: number) => void,
): Promise<{
  response: GeoJSONFileResponse;
  transfer?: Transferable[];
}> {
  let text: string;
  if (request.file !== undefined) {
    const file = request.file;
    text = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          onProgress(event.loaded, event.total);
        }
      };
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error!);
      reader.onabort = () =>
        reject(new DOMException("File read aborted", "AbortError"));
      reader.readAsText(file);
    });
  } else if (request.url !== undefined) {
    const r = await fetch(request.url);
    if (!r.ok) {
      throw new Error(
        `Failed to load GeoJSON from ${request.url}: ${r.status} ${r.statusText}`,
      );
    }
    if (r.body === null) {
      throw new Error(`Response for ${request.url} has no body.`);
    }
    const contentLength = r.headers.get("Content-Length");
    const byteLength = contentLength !== null ? Number(contentLength) : null;
    const reader = r.body.getReader();
    const blobParts: BlobPart[] = [];
    let bytesRead = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      blobParts.push(value);
      bytesRead += value.length;
      if (byteLength !== null) {
        onProgress(bytesRead, Math.max(byteLength, bytesRead));
      }
    }
    const blob = await new Blob(blobParts).arrayBuffer();
    text = new TextDecoder().decode(blob);
  } else {
    throw new Error("A URL or file is required to load data.");
  }
  const geo = JSON.parse(text) as GeoJSON; // TODO Validate GeoJSON
  const { ids, names, geometry } = parseGeoJSON(
    geo,
    request.idProperty,
    request.nameProperty,
    onProgress,
  );
  return { response: { op: "file", geometry, ids, names } };
}

function parseGeoJSON(
  geo: GeoJSON<Geometry | null>,
  idProperty: string | undefined,
  nameProperty: string | undefined,
  onProgress: (progress: number, total: number) => void,
): {
  ids: number[] | undefined;
  names: string[] | undefined;
  geometry: ShapesGeometry;
} {
  if (geo === null) {
    throw new Error("GeoJSON data must not be null.");
  }
  if (idProperty !== undefined && geo.type !== "FeatureCollection") {
    throw new Error(
      "ID properties can only be used with GeoJSON FeatureCollections.",
    );
  }
  if (nameProperty !== undefined && geo.type !== "FeatureCollection") {
    throw new Error(
      "Name properties can only be used with GeoJSON FeatureCollections.",
    );
  }

  const ids: number[] = [];
  const names: string[] = [];
  const builder = new ShapesGeometryBuilder();

  let valid = false;
  switch (geo.type) {
    case "FeatureCollection":
      for (let i = 0; i < geo.features.length; i++) {
        const feature = geo.features[i]!;
        if (feature.geometry === null) {
          console.warn("Skipping feature with null geometry.");
          continue;
        }
        const shapeAppended = builder.addGeometry(feature.geometry);
        if (shapeAppended && idProperty !== undefined) {
          const id = feature.properties?.[idProperty] as unknown;
          if (id === undefined || id === "") {
            throw new Error(`Feature is missing ID '${idProperty}'`);
          }
          const numericId = Number(id);
          if (!Number.isSafeInteger(numericId)) {
            throw new Error(`Feature has invalid ID '${idProperty}'`);
          }
          ids.push(numericId);
        }
        if (shapeAppended && nameProperty !== undefined) {
          const name = feature.properties?.[nameProperty] as unknown;
          if (name === undefined) {
            throw new Error(`Feature is missing name '${nameProperty}'.`);
          }
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          names.push(String(name));
        }
        valid ||= shapeAppended;
        onProgress(i + 1, geo.features.length);
      }
      break;
    case "Feature":
      if (geo.geometry !== null) {
        valid = builder.addGeometry(geo.geometry);
      }
      break;
    case "GeometryCollection":
      for (let i = 0; i < geo.geometries.length; i++) {
        const geometry = geo.geometries[i]!;
        const shapeAppended = builder.addGeometry(geometry);
        valid ||= shapeAppended;
        onProgress(i + 1, geo.geometries.length);
      }
      break;
    default:
      valid = builder.addGeometry(geo);
      break;
  }
  if (!valid) {
    throw new Error("No valid geometries found in GeoJSON data.");
  }

  return {
    ids: idProperty !== undefined ? ids : undefined,
    names: nameProperty !== undefined ? names : undefined,
    geometry: builder.build(),
  };
}
