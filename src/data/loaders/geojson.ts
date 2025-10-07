import {
  ShapesDataSource,
  ShapesDataSourceKeysWithDefaults,
  completeShapesDataSource,
} from "../../model/shapes";
import { MultiPolygon } from "../../types";
import { ShapesData } from "../shapes";
import { AbstractShapesDataLoader } from "./base";

export const GEOJSON_SHAPES_DATA_SOURCE = "geojson";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface GeoJSONShapesDataSource
  extends ShapesDataSource<typeof GEOJSON_SHAPES_DATA_SOURCE> {
  // TODO add additional properties if needed (type, path, url are inherited from ShapesDataSource)
}

// TODO add additional properties from GeoJSONShapesDataSource that have default values (if needed)
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
    // TODO set default values for additional properties (if needed)
    ...geojsonShapesDataSource,
  };
}

export class GeoJSONShapesDataLoader extends AbstractShapesDataLoader<
  CompleteGeoJSONShapesDataSource,
  GeoJSONShapesData
> {
  loadShapes(signal?: AbortSignal): Promise<GeoJSONShapesData> {
    signal?.throwIfAborted();
    // TODO implement loading of GeoJSON data (not necessarily load the geometries just yet; make function async if needed)
    throw new Error("Method not implemented.");
  }
}

export class GeoJSONShapesData implements ShapesData {
  getLength(): number {
    // TODO implement length
    throw new Error("Method not implemented.");
  }

  loadPolygons(signal?: AbortSignal): Promise<MultiPolygon[]> {
    signal?.throwIfAborted();
    // TODO implement loading of GeoJSON geometries (make function async if needed)
    throw new Error("Method not implemented.");
  }

  destroy(): void {
    // TODO implement cleanup if necessary (otherwise leave function body empty)
    throw new Error("Method not implemented.");
  }
}
