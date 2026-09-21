import type { FileMetaData } from "hyparquet";
import { describe, expect, it } from "vitest";

import { ParquetMetadataUtils } from "./ParquetMetadataUtils";

function fakeMetadata(geo?: string): FileMetaData {
  return {
    key_value_metadata: geo !== undefined ? [{ key: "geo", value: geo }] : [],
  } as unknown as FileMetaData;
}

function fakePandasMetadata(pandas?: string): FileMetaData {
  return {
    key_value_metadata:
      pandas !== undefined ? [{ key: "pandas", value: pandas }] : [],
  } as unknown as FileMetaData;
}

// As written by geopandas 1.1.1 for a SpatialData circles element
const points = fakeMetadata(
  JSON.stringify({
    primary_column: "geometry",
    columns: {
      geometry: {
        encoding: "WKB",
        crs: null,
        geometry_types: ["Point"],
        bbox: [309, 328, 2748, 2727],
      },
    },
    version: "1.0.0",
  }),
);

// As written by geopandas 1.0.1 for a SpatialData polygons element
const polygons = fakeMetadata(
  JSON.stringify({
    primary_column: "geometry",
    columns: {
      geometry: {
        encoding: "WKB",
        crs: null,
        geometry_types: ["Polygon"],
        bbox: [0, 0, 1499, 1499],
      },
    },
    version: "1.0.0",
  }),
);

describe("ParquetMetadataUtils", () => {
  describe("readGeoColumns", () => {
    it("reads the geometry columns of a GeoParquet file", () => {
      expect(ParquetMetadataUtils.readGeoColumns(points)).toEqual([
        {
          name: "geometry",
          primary: true,
          geometryTypes: ["Point"],
          bbox: [309, 328, 2748, 2727],
        },
      ]);
    });

    it("reads no columns from a file without GeoParquet metadata", () => {
      expect(ParquetMetadataUtils.readGeoColumns(fakeMetadata())).toEqual([]);
    });

    it("skips columns that are not encoded as WKB", () => {
      const metadata = fakeMetadata(
        JSON.stringify({
          primary_column: "geometry",
          columns: { geometry: { encoding: "point" } },
        }),
      );
      expect(ParquetMetadataUtils.readGeoColumns(metadata)).toEqual([]);
    });

    it("reads no bounds from a column without a complete bounding box", () => {
      const metadata = fakeMetadata(
        JSON.stringify({
          primary_column: "geometry",
          columns: {
            geometry: { encoding: "WKB", geometry_types: ["Point"], bbox: [0] },
          },
        }),
      );
      expect(
        ParquetMetadataUtils.readGeoColumns(metadata)[0]!.bbox,
      ).toBeUndefined();
    });

    it("reads the 2D bounds of a 3D bounding box", () => {
      const metadata = fakeMetadata(
        JSON.stringify({
          primary_column: "geometry",
          columns: {
            geometry: { encoding: "WKB", bbox: [0, 1, 2, 10, 11, 12] },
          },
        }),
      );
      expect(ParquetMetadataUtils.readGeoColumns(metadata)[0]!.bbox).toEqual([
        0, 1, 10, 11,
      ]);
    });
  });

  describe("getPrimaryColumn", () => {
    it("returns the column marked as primary", () => {
      const geoColumns = ParquetMetadataUtils.readGeoColumns(
        fakeMetadata(
          JSON.stringify({
            primary_column: "outline",
            columns: {
              centroid: { encoding: "WKB", geometry_types: ["Point"] },
              outline: { encoding: "WKB", geometry_types: ["Polygon"] },
            },
          }),
        ),
      );
      expect(ParquetMetadataUtils.getPrimaryColumn(geoColumns)?.name).toBe(
        "outline",
      );
    });

    it("returns no column for a file without geometry columns", () => {
      expect(ParquetMetadataUtils.getPrimaryColumn([])).toBeUndefined();
    });
  });

  describe("getCoordinateColumns", () => {
    it("derives a coordinate column pair per point geometry column", () => {
      const geoColumns = ParquetMetadataUtils.readGeoColumns(points);
      expect(ParquetMetadataUtils.getCoordinateColumns(geoColumns)).toEqual([
        { column: "geometry[x]", geometryColumn: "geometry", axis: "x" },
        { column: "geometry[y]", geometryColumn: "geometry", axis: "y" },
      ]);
    });

    it("derives a pair from a column that declares no geometry types", () => {
      const geoColumns = ParquetMetadataUtils.readGeoColumns(
        fakeMetadata(
          JSON.stringify({
            primary_column: "geometry",
            columns: { geometry: { encoding: "WKB", geometry_types: [] } },
          }),
        ),
      );
      expect(ParquetMetadataUtils.getCoordinateColumns(geoColumns)).toEqual([
        { column: "geometry[x]", geometryColumn: "geometry", axis: "x" },
        { column: "geometry[y]", geometryColumn: "geometry", axis: "y" },
      ]);
    });

    it("derives no coordinate columns from polygons", () => {
      const geoColumns = ParquetMetadataUtils.readGeoColumns(polygons);
      expect(ParquetMetadataUtils.getCoordinateColumns(geoColumns)).toEqual([]);
    });
  });

  describe("readIndexColumn", () => {
    it("reads the column an unnamed index was written as", () => {
      // As written by geopandas 1.0.1 for a SpatialData Xenium element
      const metadata = fakePandasMetadata(
        JSON.stringify({
          index_columns: ["__index_level_0__"],
          columns: [
            { name: "geometry", field_name: "geometry" },
            {
              name: null,
              field_name: "__index_level_0__",
              pandas_type: "int64",
            },
          ],
        }),
      );
      expect(ParquetMetadataUtils.readIndexColumn(metadata)).toBe(
        "__index_level_0__",
      );
    });

    it("reads the column a named index was written as", () => {
      const metadata = fakePandasMetadata(
        JSON.stringify({
          index_columns: ["cell_id"],
          columns: [{ field_name: "cell_id", pandas_type: "int32" }],
        }),
      );
      expect(ParquetMetadataUtils.readIndexColumn(metadata)).toBe("cell_id");
    });

    it("reads no column for an index that is not an integer", () => {
      // As written by geopandas for a SpatialData Xenium element with string
      // cell IDs, which item IDs cannot hold
      const metadata = fakePandasMetadata(
        JSON.stringify({
          index_columns: ["__index_level_0__"],
          columns: [
            {
              name: null,
              field_name: "__index_level_0__",
              pandas_type: "unicode",
            },
          ],
        }),
      );
      expect(ParquetMetadataUtils.readIndexColumn(metadata)).toBeUndefined();
    });

    it("reads no column for an index missing from the column metadata", () => {
      const metadata = fakePandasMetadata(
        JSON.stringify({ index_columns: ["cell_id"] }),
      );
      expect(ParquetMetadataUtils.readIndexColumn(metadata)).toBeUndefined();
    });

    it("reads no column for a range index", () => {
      const metadata = fakePandasMetadata(
        JSON.stringify({
          index_columns: [
            { kind: "range", name: null, start: 0, stop: 355, step: 1 },
          ],
        }),
      );
      expect(ParquetMetadataUtils.readIndexColumn(metadata)).toBeUndefined();
    });

    it("reads no column from a file without pandas metadata", () => {
      expect(
        ParquetMetadataUtils.readIndexColumn(fakePandasMetadata()),
      ).toBeUndefined();
    });
  });
});
