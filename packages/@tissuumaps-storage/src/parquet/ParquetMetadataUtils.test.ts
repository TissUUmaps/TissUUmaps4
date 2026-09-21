import type { FileMetaData } from "hyparquet";
import { describe, expect, it } from "vitest";

import { ParquetMetadataUtils } from "./ParquetMetadataUtils";

function fakeMetadata(geo?: string): FileMetaData {
  return {
    key_value_metadata: geo !== undefined ? [{ key: "geo", value: geo }] : [],
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
        "geometry[x]",
        "geometry[y]",
      ]);
    });

    it("derives no coordinate columns from polygons", () => {
      const geoColumns = ParquetMetadataUtils.readGeoColumns(polygons);
      expect(ParquetMetadataUtils.getCoordinateColumns(geoColumns)).toEqual([]);
    });
  });

  describe("parseCoordinateColumn", () => {
    it("parses a coordinate column", () => {
      expect(ParquetMetadataUtils.parseCoordinateColumn("geometry[y]")).toEqual(
        {
          geometryColumn: "geometry",
          axis: "y",
        },
      );
    });

    it("parses no column that is not a coordinate column", () => {
      expect(
        ParquetMetadataUtils.parseCoordinateColumn("geometry"),
      ).toBeUndefined();
      expect(
        ParquetMetadataUtils.parseCoordinateColumn("geometry[z]"),
      ).toBeUndefined();
    });
  });

  describe("resolveCoordinateColumn", () => {
    it("resolves a coordinate column to its geometry column and axis", () => {
      const geoColumns = ParquetMetadataUtils.readGeoColumns(points);
      const coordinates = ParquetMetadataUtils.resolveCoordinateColumn(
        geoColumns,
        "geometry[y]",
      );
      expect(coordinates?.geoColumn.name).toBe("geometry");
      expect(coordinates?.axis).toBe("y");
    });

    it("resolves neither the geometry column itself nor an unknown one", () => {
      const geoColumns = ParquetMetadataUtils.readGeoColumns(points);
      expect(
        ParquetMetadataUtils.resolveCoordinateColumn(geoColumns, "geometry"),
      ).toBeUndefined();
      expect(
        ParquetMetadataUtils.resolveCoordinateColumn(geoColumns, "centroid[x]"),
      ).toBeUndefined();
    });

    it("resolves no coordinate column of a polygon column", () => {
      const geoColumns = ParquetMetadataUtils.readGeoColumns(polygons);
      expect(
        ParquetMetadataUtils.resolveCoordinateColumn(geoColumns, "geometry[x]"),
      ).toBeUndefined();
    });
  });
});
