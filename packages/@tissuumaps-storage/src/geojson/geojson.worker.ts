import type { Feature, GeoJSON, Geometry } from "geojson";

import {
  type ShapesAppender,
  type ShapesGeometry,
  ShapesUtils,
} from "@tissuumaps/core";

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
  ids: number[];
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

/**
 * Minimum share of the total between two progress reports
 *
 * Progress is reported per downloaded chunk and per parsed feature. Reporting
 * every percent keeps the number of messages bounded whatever the data size.
 */
const progressReportFraction = 0.01;

/**
 * Wraps a progress callback so that it is only called every
 * {@link progressReportFraction} of the total, and on completion
 *
 * A report below the previous one starts a new phase, e.g. parsing after
 * downloading.
 *
 * @param onProgress - The callback to wrap
 * @returns The wrapped callback
 */
function stepProgress(
  onProgress: (progress: number, total: number) => void,
): (progress: number, total: number) => void {
  let lastReportedFraction = -Infinity;
  return (progress, total) => {
    const fraction = total > 0 ? progress / total : 1;
    if (fraction < lastReportedFraction) {
      lastReportedFraction = -Infinity;
    }
    if (
      fraction >= 1 ||
      fraction - lastReportedFraction >= progressReportFraction
    ) {
      lastReportedFraction = fraction;
      onProgress(progress, total);
    }
  };
}

ctx.onmessage = (event) => {
  const request = event.data;
  void (async () => {
    try {
      let result;
      switch (request.op) {
        case "file":
          result = await handleFileRequest(
            request,
            stepProgress((progress, total) =>
              ctx.postMessage({ progress, total }),
            ),
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
  const { ids, names, geometry } = await parseGeoJSON(
    geo,
    request.idProperty,
    request.nameProperty,
    onProgress,
  );
  return { response: { op: "file", geometry, ids, names } };
}

/**
 * Appends a GeoJSON geometry as one shape
 *
 * @param append - The appender of the shapes geometry under construction
 * @param geometry - The geometry to append
 * @param id - The ID of the shape
 * @param name - The name of the shape, if any
 */
function appendGeometry(
  append: ShapesAppender,
  geometry: Geometry,
  id: number,
  name?: string,
): void {
  if (geometry.type === "Polygon") {
    append([geometry.coordinates], id, name);
    return;
  }
  if (geometry.type === "MultiPolygon") {
    append(geometry.coordinates, id, name);
    return;
  }
  console.warn(`Unsupported geometry type: ${geometry.type}`);
}

function readFeatureId(
  feature: Feature<Geometry | null>,
  idProperty: string,
): number {
  const id = feature.properties?.[idProperty] as unknown;
  if (id === undefined || id === "") {
    throw new Error(`Feature is missing ID '${idProperty}'`);
  }
  const numericId = Number(id);
  if (!Number.isSafeInteger(numericId)) {
    throw new Error(`Feature has invalid ID '${idProperty}'`);
  }
  return numericId;
}

function readFeatureName(
  feature: Feature<Geometry | null>,
  nameProperty: string,
): string {
  const name = feature.properties?.[nameProperty] as unknown;
  if (name === undefined) {
    throw new Error(`Feature is missing name '${nameProperty}'.`);
  }
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  return String(name);
}

async function parseGeoJSON(
  geo: GeoJSON<Geometry | null>,
  idProperty: string | undefined,
  nameProperty: string | undefined,
  onProgress: (progress: number, total: number) => void,
): Promise<{
  ids: number[];
  names: string[] | undefined;
  geometry: ShapesGeometry;
}> {
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

  const { geometry, ids, names } = await ShapesUtils.buildGeometry((append) => {
    switch (geo.type) {
      case "FeatureCollection":
        for (let i = 0; i < geo.features.length; i++) {
          const feature = geo.features[i]!;
          if (feature.geometry === null) {
            console.warn("Skipping feature with null geometry.");
            continue;
          }
          appendGeometry(
            append,
            feature.geometry,
            idProperty !== undefined ? readFeatureId(feature, idProperty) : i,
            nameProperty !== undefined
              ? readFeatureName(feature, nameProperty)
              : undefined,
          );
          onProgress(i + 1, geo.features.length);
        }
        break;
      case "Feature":
        if (geo.geometry !== null) {
          appendGeometry(append, geo.geometry, 0);
        }
        break;
      case "GeometryCollection":
        for (let i = 0; i < geo.geometries.length; i++) {
          appendGeometry(append, geo.geometries[i]!, i);
          onProgress(i + 1, geo.geometries.length);
        }
        break;
      default:
        appendGeometry(append, geo, 0);
        break;
    }
  });
  if (geometry.shapePolygonOffsets.length === 1) {
    throw new Error("No valid geometries found in GeoJSON data.");
  }

  return { ids, names, geometry };
}
