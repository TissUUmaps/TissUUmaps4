import type * as geojson from "geojson";

import { ParseUtils, type ShapesGeometry } from "@tissuumaps/core";

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
  ids: number[] | undefined;
  names: string[] | undefined;
  geometry: ShapesGeometry;
};

export type GeoJSONWorkerRequest = GeoJSONFileRequest;

export type GeoJSONWorkerResponse = GeoJSONFileResponse | { error: string };

export type GeoJSONWorkerResponseFor<
  TWorkerRequest extends GeoJSONWorkerRequest,
> = Extract<GeoJSONWorkerResponse, { op: TWorkerRequest["op"] }>;

type ShapesGeometryAccumulator = {
  shapePolygonOffsets: number[];
  polygonRingOffsets: number[];
  ringVertexOffsets: number[];
  coords: number[];
};

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<GeoJSONWorkerRequest>) => void) | null;
  postMessage: (
    message: GeoJSONWorkerResponse,
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
          result = await handleFileRequest(request);
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

async function handleFileRequest(request: GeoJSONFileRequest): Promise<{
  response: GeoJSONFileResponse;
  transfer?: Transferable[];
}> {
  let text: string;
  if (request.file !== undefined) {
    text = await request.file.text();
  } else if (request.url !== undefined) {
    const r = await fetch(request.url);
    if (!r.ok) {
      throw new Error(
        `Failed to load GeoJSON from ${request.url}: ${r.status} ${r.statusText}`,
      );
    }
    text = await r.text();
  } else {
    throw new Error("A URL or file is required to load data.");
  }
  const geo = JSON.parse(text) as geojson.GeoJSON; // TODO Validate GeoJSON
  const { ids, names, geometry } = parseGeoJSON(
    geo,
    request.idProperty,
    request.nameProperty,
  );
  return { response: { op: "file", ids, names, geometry } };
}

function parseGeoJSON(
  geo: geojson.GeoJSON<geojson.Geometry | null>,
  idProperty: string | undefined,
  nameProperty: string | undefined,
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
  const accumulator: ShapesGeometryAccumulator = {
    shapePolygonOffsets: [0],
    polygonRingOffsets: [0],
    ringVertexOffsets: [0],
    coords: [],
  };

  let valid = false;
  switch (geo.type) {
    case "FeatureCollection":
      for (const feature of geo.features) {
        if (feature.geometry === null) {
          console.warn("Skipping feature with null geometry.");
          continue;
        }
        const shapeAppended = parseGeometry(feature.geometry, accumulator);
        if (shapeAppended && idProperty !== undefined) {
          const id = feature.properties?.[idProperty] as unknown;
          if (id === undefined) {
            throw new Error(`Feature is missing ID '${idProperty}'`);
          }
          ids.push(ParseUtils.parseSafeInt(id));
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
      }
      break;
    case "Feature":
      if (geo.geometry !== null) {
        valid = parseGeometry(geo.geometry, accumulator);
      }
      break;
    case "GeometryCollection":
      for (const geometry of geo.geometries) {
        const shapeAppended = parseGeometry(geometry, accumulator);
        valid ||= shapeAppended;
      }
      break;
    default:
      valid = parseGeometry(geo, accumulator);
  }
  if (!valid) {
    throw new Error("No valid geometries found in GeoJSON data.");
  }

  return {
    ids: idProperty !== undefined ? ids : undefined,
    names: nameProperty !== undefined ? names : undefined,
    geometry: {
      shapePolygonOffsets: new Uint32Array(accumulator.shapePolygonOffsets),
      polygonRingOffsets: new Uint32Array(accumulator.polygonRingOffsets),
      ringVertexOffsets: new Uint32Array(accumulator.ringVertexOffsets),
      coords: new Float32Array(accumulator.coords),
    },
  };
}

function parseGeometry(
  geometry: geojson.Geometry,
  accumulator: ShapesGeometryAccumulator,
): boolean {
  let polygons: geojson.Position[][][];
  if (geometry.type === "Polygon") {
    polygons = [geometry.coordinates];
  } else if (geometry.type === "MultiPolygon") {
    polygons = geometry.coordinates;
  } else {
    console.warn(`Unsupported GeoJSON geometry type: ${geometry.type}`);
    return false;
  }
  let polygonsAdded = false;
  for (const rings of polygons) {
    if (rings.length === 0 || rings[0]!.length < 3) {
      console.warn("Skipping polygon without a valid shell.");
      continue;
    }
    let ringsAdded = false;
    for (const ring of rings) {
      if (ring.length < 3) {
        console.warn("Skipping invalid ring with fewer than three vertices.");
        continue;
      }
      for (const pos of ring) {
        accumulator.coords.push(pos[0]!, pos[1]!);
      }
      accumulator.ringVertexOffsets.push(accumulator.coords.length / 2);
      ringsAdded = true;
    }
    if (!ringsAdded) {
      console.warn("Skipping polygon without valid rings.");
      continue;
    }
    accumulator.polygonRingOffsets.push(
      accumulator.ringVertexOffsets.length - 1,
    );
    polygonsAdded = true;
  }
  if (!polygonsAdded) {
    return false;
  }
  accumulator.shapePolygonOffsets.push(
    accumulator.polygonRingOffsets.length - 1,
  );
  return true;
}
