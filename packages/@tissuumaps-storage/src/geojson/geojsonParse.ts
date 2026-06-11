import type * as geojson from "geojson";

import {
  type MultiPolygon,
  type Polygon,
  type ShapesGeometry,
} from "@tissuumaps/core";

/**
 * Pure GeoJSON parsing, isolated from the worker message wiring so it can be
 * reasoned about and reused. Parses the text, extracts per-feature ids/names,
 * and flattens the polygon geometry into the transfer-friendly
 * {@link ShapesGeometry}.
 *
 * The flattening is done here (rather than via `@tissuumaps/core`'s
 * `multiPolygonsToGeometry`) so the worker bundle never imports the core
 * barrel, which eagerly pulls in OpenSeadragon and would crash a worker that
 * has no `document`.
 */
export function parseGeoJSON(
  text: string,
  idProperty?: string,
  nameProperty?: string,
): { geometry: ShapesGeometry; ids?: number[]; names?: string[] } {
  const geo = JSON.parse(text) as geojson.GeoJSON<geojson.Geometry | null>; // TODO Validate GeoJSON

  let ids: number[] | undefined;
  if (idProperty !== undefined) {
    if (geo === null || geo.type !== "FeatureCollection") {
      throw new Error(
        "ID properties can only be used with GeoJSON FeatureCollections.",
      );
    }
    ids = geo.features.map((feature) => {
      const id = feature.properties?.[idProperty] as unknown;
      if (id === undefined || typeof id !== "number" || !Number.isInteger(id)) {
        throw new Error(`Feature is missing integer ID '${idProperty}'.`);
      }
      return id;
    });
  }

  let names: string[] | undefined;
  if (nameProperty !== undefined) {
    if (geo === null || geo.type !== "FeatureCollection") {
      throw new Error(
        "Name properties can only be used with GeoJSON FeatureCollections.",
      );
    }
    names = geo.features.map((feature) => {
      const name = feature.properties?.[nameProperty] as unknown;
      if (name === undefined) {
        throw new Error(`Feature is missing name '${nameProperty}'.`);
      }
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return String(name);
    });
  }

  return { geometry: toShapesGeometry(parseGeoJSONGeometry(geo)), ids, names };
}

/**
 * Flattens an array of {@link MultiPolygon}s (one per shape) into the flat
 * {@link ShapesGeometry} representation, in two passes (count, then fill) to
 * size the typed arrays exactly.
 */
function toShapesGeometry(multiPolygons: MultiPolygon[]): ShapesGeometry {
  let polygonCount = 0;
  let ringCount = 0;
  let vertexCount = 0;
  for (const multiPolygon of multiPolygons) {
    polygonCount += multiPolygon.polygons.length;
    for (const polygon of multiPolygon.polygons) {
      ringCount += 1 + polygon.holes.length;
      vertexCount += polygon.shell.length;
      for (const hole of polygon.holes) {
        vertexCount += hole.length;
      }
    }
  }

  const coords = new Float32Array(2 * vertexCount);
  const ringVertexOffsets = new Uint32Array(ringCount + 1);
  const polygonRingOffsets = new Uint32Array(polygonCount + 1);
  const shapePolygonOffsets = new Uint32Array(multiPolygons.length + 1);

  let vertexIndex = 0;
  let ringIndex = 0;
  let polygonIndex = 0;
  for (let s = 0; s < multiPolygons.length; s++) {
    shapePolygonOffsets[s] = polygonIndex;
    for (const polygon of multiPolygons[s]!.polygons) {
      polygonRingOffsets[polygonIndex] = ringIndex;
      polygonIndex++;
      for (const ring of [polygon.shell, ...polygon.holes]) {
        ringVertexOffsets[ringIndex] = vertexIndex;
        ringIndex++;
        for (const vertex of ring) {
          coords[2 * vertexIndex] = vertex.x;
          coords[2 * vertexIndex + 1] = vertex.y;
          vertexIndex++;
        }
      }
    }
  }
  shapePolygonOffsets[multiPolygons.length] = polygonIndex;
  polygonRingOffsets[polygonCount] = ringIndex;
  ringVertexOffsets[ringCount] = vertexIndex;

  return { coords, ringVertexOffsets, polygonRingOffsets, shapePolygonOffsets };
}

function parseGeoJSONGeometry(
  geo: geojson.GeoJSON<geojson.Geometry | null>,
): MultiPolygon[] {
  if (geo === null) {
    return [];
  }
  switch (geo.type) {
    case "FeatureCollection":
      return geo.features.flatMap((feature) =>
        feature.geometry !== null ? parseGeometry(feature.geometry) : [],
      );
    case "Feature":
      return geo.geometry !== null ? parseGeometry(geo.geometry) : [];
    case "GeometryCollection":
      return geo.geometries.flatMap((geometry) => parseGeometry(geometry));
    default:
      return parseGeometry(geo);
  }
}

function parseGeometry(geometry: geojson.Geometry): MultiPolygon[] {
  switch (geometry.type) {
    case "Polygon":
      return [{ polygons: [parseRings(geometry.coordinates)] }];
    case "MultiPolygon":
      return [
        { polygons: geometry.coordinates.map((rings) => parseRings(rings)) },
      ];
    default:
      console.warn(`Unsupported GeoJSON geometry type: ${geometry.type}`);
      return [];
  }
}

function parseRings(rings: geojson.Position[][]): Polygon {
  const [shellRing, ...holeRings] = rings;
  if (shellRing === undefined) {
    throw new Error("Polygon has no outer ring.");
  }
  const shell = shellRing.map((pos) => ({ x: pos[0]!, y: pos[1]! }));
  const holes = holeRings.map((holeRing) =>
    holeRing.map((pos) => ({ x: pos[0]!, y: pos[1]! })),
  );
  return { shell, holes };
}
