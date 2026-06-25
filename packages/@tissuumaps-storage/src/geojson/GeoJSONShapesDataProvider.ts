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

type ShapesGeometryAccumulator = {
  shapePolygonOffsets: number[];
  polygonRingOffsets: number[];
  ringVertexOffsets: number[];
  coords: number[];
};

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

    let geo;
    if (defaultDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(defaultDataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const text = await file.text();
      signal?.throwIfAborted();
      geo = JSON.parse(text) as geojson.GeoJSON; // TODO Validate GeoJSON
    } else if (defaultDataSource.url !== undefined) {
      const response = await fetch(defaultDataSource.url, { signal });
      signal?.throwIfAborted();
      if (!response.ok) {
        throw new Error(
          `Failed to load GeoJSON from ${defaultDataSource.url}: ${response.status} ${response.statusText}`,
        );
      }
      const text = await response.text();
      signal?.throwIfAborted();
      geo = JSON.parse(text) as geojson.GeoJSON; // TODO Validate GeoJSON
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    const { ids, names, geometry } = GeoJSONShapesDataProvider._parseGeoJSON(
      geo,
      defaultDataSource.idProperty,
      defaultDataSource.nameProperty,
    );

    return new GeoJSONShapesData(ids, names, geometry);
  }

  private static _parseGeoJSON(
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
          const shapeAppended = GeoJSONShapesDataProvider._parseGeometry(
            feature.geometry,
            accumulator,
          );
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
          valid = GeoJSONShapesDataProvider._parseGeometry(
            geo.geometry,
            accumulator,
          );
        }
        break;
      case "GeometryCollection":
        for (const geometry of geo.geometries) {
          valid ||= GeoJSONShapesDataProvider._parseGeometry(
            geometry,
            accumulator,
          );
        }
        break;
      default:
        valid = GeoJSONShapesDataProvider._parseGeometry(geo, accumulator);
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

  private static _parseGeometry(
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
}
