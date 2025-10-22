import {
  ShapesDataSource,
  ShapesDataSourceKeysWithDefaults,
  completeShapesDataSource,
} from "../../model/shapes";
import { MultiPolygon, Vertex } from "../../types";
import { ShapesData } from "../shapes";
import { AbstractShapesDataLoader } from "./base";

export const GEOJSON_SHAPES_DATA_SOURCE = "geojson";

export type GeoJSONShapesDataSource = ShapesDataSource<
  typeof GEOJSON_SHAPES_DATA_SOURCE
>;

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

// Minimal GeoJSON types (avoid adding dependency on @types/geojson)
type GeoJSONPosition = number[]; // [x, y, ...]
type GeoJSONPolygon = { type: "Polygon"; coordinates: GeoJSONPosition[][] };
type GeoJSONMultiPolygon = {
  type: "MultiPolygon";
  coordinates: GeoJSONPosition[][][];
};
type GeoJSONGeometry =
  | GeoJSONPolygon
  | GeoJSONMultiPolygon
  | { type: string; coordinates?: unknown };

type GeoJSONFeature = {
  type: "Feature";
  geometry: GeoJSONGeometry | null;
  properties?: Record<string, unknown> | null;
};

type GeoJSONFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJSONFeature[];
};

type GeoJSONObject =
  | GeoJSONFeatureCollection
  | GeoJSONFeature
  | GeoJSONGeometry
  | null;

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
  ): Promise<GeoJSONObject> {
    const { signal } = options;
    signal?.throwIfAborted();
    if (this.dataSource.path !== undefined && this.workspace !== null) {
      const fh = await this.workspace.getFileHandle(this.dataSource.path);
      signal?.throwIfAborted();
      const file = await fh.getFile();
      signal?.throwIfAborted();
      const text = await file.text();
      return JSON.parse(text) as GeoJSONObject;
    }
    if (this.dataSource.url !== undefined) {
      const resp = await fetch(this.dataSource.url);
      if (!resp.ok) {
        throw new Error(
          `Failed to fetch GeoJSON: ${resp.status} ${resp.statusText}`,
        );
      }
      const text = await resp.text();
      return JSON.parse(text) as GeoJSONObject;
    }
    if (this.dataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    }
    throw new Error("A URL or workspace path is required to load data.");
  }

  private _parseGeoJSONToMultiPolygons(obj: GeoJSONObject): MultiPolygon[] {
    if (!obj) return [];

    const multiPolygons: MultiPolygon[] = [];

    const pushFromGeometry = (geometry: GeoJSONGeometry | null) => {
      if (!geometry || !("type" in geometry)) return;
      const type = geometry.type;
      if (type === "Polygon") {
        const coords = (geometry as GeoJSONPolygon).coordinates;
        const polygon = this._coordsToPolygon(coords);
        multiPolygons.push({ polygons: [polygon] });
      } else if (type === "MultiPolygon") {
        const coords = (geometry as GeoJSONMultiPolygon).coordinates;
        const polygons = coords.map((polygonCoords) =>
          this._coordsToPolygon(polygonCoords),
        );
        multiPolygons.push({ polygons });
      }
    };

    // FeatureCollection
    if ((obj as GeoJSONFeatureCollection).type === "FeatureCollection") {
      const fc = obj as GeoJSONFeatureCollection;
      for (const feature of fc.features) {
        if (!feature || !feature.geometry) continue;
        pushFromGeometry(feature.geometry);
      }
    } else if ((obj as GeoJSONFeature).type === "Feature") {
      const f = obj as GeoJSONFeature;
      pushFromGeometry(f.geometry);
    } else if (
      (obj as GeoJSONGeometry).type === "Polygon" ||
      (obj as GeoJSONGeometry).type === "MultiPolygon"
    ) {
      pushFromGeometry(obj as GeoJSONGeometry);
    }

    return multiPolygons;
  }

  private _coordsToPolygon(
    coords: GeoJSONPosition[][],
  ): MultiPolygon["polygons"][0] {
    const shell: Vertex[] = [];
    const holes: Vertex[][] = [];
    if (!Array.isArray(coords) || coords.length === 0) return { shell, holes };

    const toVertex = (pos: GeoJSONPosition): Vertex => ({
      x: Number(pos[0]),
      y: Number(pos[1]),
    });

    const exterior = coords[0];
    if (Array.isArray(exterior)) {
      for (const p of exterior) shell.push(toVertex(p));
    }

    for (let i = 1; i < coords.length; i++) {
      const ring = coords[i];
      const hole: Vertex[] = [];
      if (Array.isArray(ring)) {
        for (const p of ring) hole.push(toVertex(p));
      }
      holes.push(hole);
    }

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

  async loadMultiPolygons(
    options: { signal?: AbortSignal } = {},
  ): Promise<MultiPolygon[]> {
    const { signal } = options;
    signal?.throwIfAborted();
    return Promise.resolve(this._multiPolygons);
  }

  destroy(): void {}
}
