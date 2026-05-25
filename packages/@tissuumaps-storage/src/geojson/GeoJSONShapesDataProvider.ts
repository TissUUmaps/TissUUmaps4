import type * as geojson from "geojson";

import {
  type MultiPolygon,
  type Polygon,
  type ProgressCallback,
  type ShapesDataProvider,
} from "@tissuumaps/core";

import { GeoJSONShapesData } from "./GeoJSONShapesData";
import {
  type GeoJSONShapesDataSource,
  createDefaultGeoJSONShapesDataSource,
} from "./GeoJSONShapesDataSource";

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
      geo = JSON.parse(text) as geojson.GeoJSON<geojson.Geometry | null>; // TODO Validate GeoJSON
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
      geo = JSON.parse(text) as geojson.GeoJSON<geojson.Geometry | null>; // TODO Validate GeoJSON
    } else if (defaultDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    let ids: number[] | undefined;
    const idProperty = defaultDataSource.idProperty;
    if (idProperty !== undefined) {
      if (geo === null || geo.type !== "FeatureCollection") {
        throw new Error(
          "ID properties can only be used with GeoJSON FeatureCollections.",
        );
      }
      ids = geo.features.map((feature) => {
        const id = feature.properties?.[idProperty] as unknown;
        if (
          id === undefined ||
          typeof id !== "number" ||
          !Number.isInteger(id)
        ) {
          throw new Error(`Feature is missing integer ID '${idProperty}'.`);
        }
        return id;
      });
    }

    let names: string[] | undefined;
    const nameProperty = defaultDataSource.nameProperty;
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

    const multiPolygons = GeoJSONShapesDataProvider._parseGeoJSON(geo);

    return new GeoJSONShapesData(ids, names, multiPolygons);
  }

  private static _parseGeoJSON(
    geo: geojson.GeoJSON<geojson.Geometry | null>,
  ): MultiPolygon[] {
    if (geo === null) {
      return [];
    }
    switch (geo.type) {
      case "FeatureCollection":
        return geo.features.flatMap((feature) =>
          feature.geometry !== null
            ? GeoJSONShapesDataProvider._parseGeoJSONGeometry(feature.geometry)
            : [],
        );
      case "Feature":
        return geo.geometry !== null
          ? GeoJSONShapesDataProvider._parseGeoJSONGeometry(geo.geometry)
          : [];
      case "GeometryCollection":
        return geo.geometries.flatMap((geometry) =>
          GeoJSONShapesDataProvider._parseGeoJSONGeometry(geometry),
        );
      default:
        return GeoJSONShapesDataProvider._parseGeoJSONGeometry(geo);
    }
  }

  private static _parseGeoJSONGeometry(
    geometry: geojson.Geometry,
  ): MultiPolygon[] {
    switch (geometry.type) {
      case "Polygon":
        return [
          {
            polygons: [
              GeoJSONShapesDataProvider._parseGeoJSONGeometryRings(
                geometry.coordinates,
              ),
            ],
          },
        ];
      case "MultiPolygon":
        return [
          {
            polygons: geometry.coordinates.map((rings) =>
              GeoJSONShapesDataProvider._parseGeoJSONGeometryRings(rings),
            ),
          },
        ];
      default:
        console.warn(`Unsupported GeoJSON geometry type: ${geometry.type}`);
        return [];
    }
  }

  private static _parseGeoJSONGeometryRings(
    rings: geojson.Position[][],
  ): Polygon {
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
}
