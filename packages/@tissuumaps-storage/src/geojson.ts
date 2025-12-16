import * as GeoJSON from "geojson";

import {
  type MultiPolygon,
  type Polygon,
  type RawShapesDataSource,
  type ShapesData,
  type ShapesDataSource,
  createShapesDataSource,
} from "@tissuumaps/core";

import { AbstractShapesDataLoader } from "./base";

export const geoJSONShapesDataSourceType = "geojson";
export const geoJSONShapesDataSourceDefaults = {};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RawGeoJSONShapesDataSource extends RawShapesDataSource<
  typeof geoJSONShapesDataSourceType
> {}

export type GeoJSONShapesDataSource = ShapesDataSource<
  typeof geoJSONShapesDataSourceType
> &
  Required<
    Pick<
      RawGeoJSONShapesDataSource,
      keyof typeof geoJSONShapesDataSourceDefaults
    >
  > &
  Omit<
    RawGeoJSONShapesDataSource,
    | keyof ShapesDataSource<typeof geoJSONShapesDataSourceType>
    // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
    | keyof typeof geoJSONShapesDataSourceDefaults
  >;

export function createGeoJSONShapesDataSource(
  rawGeoJSONShapesDataSource: RawGeoJSONShapesDataSource,
): GeoJSONShapesDataSource {
  return {
    ...createShapesDataSource(rawGeoJSONShapesDataSource),
    ...geoJSONShapesDataSourceDefaults,
    ...rawGeoJSONShapesDataSource,
  };
}

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
    return new GeoJSONShapesData(multiPolygons);
  }

  private async _loadGeoJSON({
    signal,
  }: { signal?: AbortSignal } = {}): Promise<
    GeoJSON.GeoJSON<GeoJSON.Geometry | null>
  > {
    signal?.throwIfAborted();
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const text = await file.text();
      signal?.throwIfAborted();
      return JSON.parse(text) as GeoJSON.GeoJSON<GeoJSON.Geometry | null>; // TODO Validate GeoJSON
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
      return JSON.parse(text) as GeoJSON.GeoJSON<GeoJSON.Geometry | null>; // TODO Validate GeoJSON
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }

  private static _parseGeoJSON(
    geo: GeoJSON.GeoJSON<GeoJSON.Geometry | null>,
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
    geometry: GeoJSON.Geometry,
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
    rings: GeoJSON.Position[][],
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

export class GeoJSONShapesData implements ShapesData {
  private readonly _multiPolygons: MultiPolygon[];

  constructor(multiPolygons: MultiPolygon[]) {
    this._multiPolygons = multiPolygons;
  }

  getLength(): number {
    return this._multiPolygons.length;
  }

  loadMultiPolygons({ signal }: { signal?: AbortSignal } = {}): Promise<
    MultiPolygon[]
  > {
    signal?.throwIfAborted();
    return Promise.resolve(this._multiPolygons);
  }

  destroy(): void {}
}
