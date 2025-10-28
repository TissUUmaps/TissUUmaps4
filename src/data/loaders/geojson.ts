import type * as GeoJSON from "geojson";

import {
  ShapesDataSource,
  ShapesDataSourceKeysWithDefaults,
  completeShapesDataSource,
} from "../../model/shapes";
import { MultiPolygon, Path, Polygon, Vertex } from "../../types";
import { ShapesData } from "../shapes";
import { AbstractShapesDataLoader } from "./base";

export const GEOJSON_SHAPES_DATA_SOURCE = "geojson";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GeoJSONShapesDataSource
  extends ShapesDataSource<typeof GEOJSON_SHAPES_DATA_SOURCE> {}

export type GeoJSONShapesDataSourceKeysWithDefaults =
  ShapesDataSourceKeysWithDefaults<typeof GEOJSON_SHAPES_DATA_SOURCE>;

export type CompleteGeoJSONShapesDataSource = Required<
  Pick<GeoJSONShapesDataSource, GeoJSONShapesDataSourceKeysWithDefaults>
> &
  Omit<GeoJSONShapesDataSource, GeoJSONShapesDataSourceKeysWithDefaults>;

export function completeGeoJSONShapesDataSource(
  geojsonShapesDataSource: GeoJSONShapesDataSource,
): CompleteGeoJSONShapesDataSource {
  return {
    ...completeShapesDataSource(geojsonShapesDataSource),
    ...geojsonShapesDataSource,
  };
}

export class GeoJSONShapesDataLoader extends AbstractShapesDataLoader<
  CompleteGeoJSONShapesDataSource,
  GeoJSONShapesData
> {
  async loadShapes(
    options: { signal?: AbortSignal } = {},
  ): Promise<GeoJSONShapesData> {
    const { signal } = options;
    signal?.throwIfAborted();
    const geo = await this._loadGeoJSON({ signal });
    signal?.throwIfAborted();
    const multipolygons = this._parseGeoJSONToMultiPolygons(geo);
    signal?.throwIfAborted();
    return new GeoJSONShapesData(multipolygons);
  }

  private async _loadGeoJSON(
    options: { signal?: AbortSignal } = {},
  ): Promise<GeoJSON.GeoJSON> {
    const { signal } = options;
    signal?.throwIfAborted();
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const text = await file.text();
      return JSON.parse(text) as GeoJSON.GeoJSON; // TODO: Validate
    }
    if (this.dataSource.url !== undefined) {
      const resp = await fetch(this.dataSource.url, { signal });
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch GeoJSON: ${resp.status} ${resp.statusText}`,
        );
      }
      const text = await resp.text();
      return JSON.parse(text) as GeoJSON.GeoJSON; // TODO: Validate
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }

  private _parseGeoJSONToMultiPolygons(obj: GeoJSON.GeoJSON): MultiPolygon[] {
    switch (obj.type) {
      case "FeatureCollection":
        // Collect the MultiPolygons of every feature and flatten them.
        return obj.features.flatMap((f) =>
          this._geometryToMultiPolygons(f?.geometry ?? null),
        );

      case "Feature":
        return this._geometryToMultiPolygons(obj.geometry);

      case "Polygon":
      case "MultiPolygon":
        return this._geometryToMultiPolygons(obj as GeoJSON.Geometry);

      default:
        return [];
    }
  }

  private _geometryToMultiPolygons(
    geometry: GeoJSON.Geometry | null,
  ): MultiPolygon[] {
    if (!geometry) return [];

    switch (geometry.type) {
      case "Polygon":
        return [
          {
            polygons: [this._coordinatesToPolygon(geometry.coordinates)],
          },
        ];

      case "MultiPolygon":
        return [
          {
            polygons: geometry.coordinates.map((coords) =>
              this._coordinatesToPolygon(coords),
            ),
          },
        ];

      default:
        return []; // TODO: Handle other geometry types.
    }
  }

  /** Convert a GeoJSON polygon coordinate array to a Polygon shape. */
  private _coordinatesToPolygon(coordinates: GeoJSON.Position[][]): Polygon {
    if (!Array.isArray(coordinates) || coordinates.length === 0) {
      return { shell: [], holes: [] };
    }

    // First ring is the exterior shell; the rest (if any) are holes.
    const [shellCoordinates, ...holeCoordinates] = coordinates;

    const shell: Path = (shellCoordinates ?? []).map((pos) =>
      this._toVertex(pos),
    );
    const holes: Path[] = holeCoordinates.map((ring) =>
      ring.map((pos) => this._toVertex(pos)),
    );

    return { shell, holes };
  }

  private _toVertex([x, y]: GeoJSON.Position): Vertex {
    return {
      x: Number(x),
      y: Number(y),
    };
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

  loadMultiPolygons(
    options: { signal?: AbortSignal } = {},
  ): Promise<MultiPolygon[]> {
    const { signal } = options;
    signal?.throwIfAborted();
    return Promise.resolve(this._multiPolygons);
  }

  destroy(): void {}
}
