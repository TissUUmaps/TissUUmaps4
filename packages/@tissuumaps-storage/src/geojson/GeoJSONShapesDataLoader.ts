import * as geojson from "geojson";

import { type MultiPolygon, type Polygon } from "@tissuumaps/core";

import { AbstractShapesDataLoader } from "../base";
import { GeoJSONShapesData } from "./GeoJSONShapesData";
import { type GeoJSONShapesDataSource } from "./GeoJSONShapesDataSource";

export class GeoJSONShapesDataLoader extends AbstractShapesDataLoader<
  GeoJSONShapesDataSource,
  GeoJSONShapesData
> {
  async loadShapes({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<GeoJSONShapesData> {
    signal?.throwIfAborted();
    const geo = await this._loadGeoJSON({ signal });
    signal?.throwIfAborted();
    const multiPolygons = GeoJSONShapesDataLoader._parseGeoJSON(geo);
    let index;
    const idProperty = this.dataSource.idProperty;
    if (idProperty !== undefined) {
      if (geo === null || geo.type !== "FeatureCollection") {
        throw new Error(
          "ID properties can only be used with GeoJSON FeatureCollections.",
        );
      }
      index = geo.features.map((feature) => {
        const id = feature.properties?.[idProperty] as unknown;
        if (id === undefined || typeof id !== "number") {
          throw new Error(
            `Feature is missing numeric ID property '${idProperty}'.`,
          );
        }
        return id;
      });
    }
    return new GeoJSONShapesData(multiPolygons, index);
  }

  private async _loadGeoJSON({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<
    geojson.GeoJSON<geojson.Geometry | null>
  > {
    signal?.throwIfAborted();
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const text = await file.text();
      signal?.throwIfAborted();
      return JSON.parse(text) as geojson.GeoJSON<geojson.Geometry | null>; // TODO Validate GeoJSON
    }
    if (this.dataSource.url !== undefined) {
      const response = await fetch(this.dataSource.url, { signal });
      signal?.throwIfAborted();
      if (!response.ok) {
        throw new Error(
          `Failed to load GeoJSON from ${this.dataSource.url}: ${response.status} ${response.statusText}`,
        );
      }
      const text = await response.text();
      signal?.throwIfAborted();
      return JSON.parse(text) as geojson.GeoJSON<geojson.Geometry | null>; // TODO Validate GeoJSON
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
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
            ? GeoJSONShapesDataLoader._parseGeoJSONGeometry(feature.geometry)
            : [],
        );
      case "Feature":
        return geo.geometry !== null
          ? GeoJSONShapesDataLoader._parseGeoJSONGeometry(geo.geometry)
          : [];
      case "GeometryCollection":
        return geo.geometries.flatMap((geometry) =>
          GeoJSONShapesDataLoader._parseGeoJSONGeometry(geometry),
        );
      default:
        return GeoJSONShapesDataLoader._parseGeoJSONGeometry(geo);
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
              GeoJSONShapesDataLoader._parseGeoJSONGeometryRings(
                geometry.coordinates,
              ),
            ],
          },
        ];
      case "MultiPolygon":
        return [
          {
            polygons: geometry.coordinates.map((rings) =>
              GeoJSONShapesDataLoader._parseGeoJSONGeometryRings(rings),
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
