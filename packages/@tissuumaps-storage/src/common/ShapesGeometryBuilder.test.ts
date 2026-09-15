import type { Position } from "geojson";
import { describe, expect, it, vi } from "vitest";

import { ShapesGeometryBuilder } from "./ShapesGeometryBuilder";

const square: Position[] = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];

const hole: Position[] = [
  [1, 1],
  [2, 1],
  [2, 2],
];

describe("ShapesGeometryBuilder", () => {
  describe("addGeometry", () => {
    it("appends a polygon as one shape with one ring", () => {
      const builder = new ShapesGeometryBuilder();
      expect(
        builder.addGeometry({ type: "Polygon", coordinates: [square] }),
      ).toBe(true);
      const geometry = builder.build();
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4]);
      expect(Array.from(geometry.coords)).toEqual([0, 0, 4, 0, 4, 4, 0, 4]);
    });

    it("appends the holes of a polygon as further rings", () => {
      const builder = new ShapesGeometryBuilder();
      builder.addGeometry({ type: "Polygon", coordinates: [square, hole] });
      const geometry = builder.build();
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 2]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4, 7]);
    });

    it("appends a multi-polygon as one shape with several polygons", () => {
      const builder = new ShapesGeometryBuilder();
      builder.addGeometry({
        type: "MultiPolygon",
        coordinates: [[square], [square, hole]],
      });
      const geometry = builder.build();
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 2]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1, 3]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4, 8, 11]);
    });

    it("appends several geometries as several shapes", () => {
      const builder = new ShapesGeometryBuilder();
      builder.addGeometry({ type: "Polygon", coordinates: [square] });
      builder.addGeometry({ type: "Polygon", coordinates: [square] });
      const geometry = builder.build();
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1, 2]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1, 2]);
    });

    it("skips a polygon without a valid shell", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const builder = new ShapesGeometryBuilder();
      expect(
        builder.addGeometry({
          type: "Polygon",
          coordinates: [
            [
              [0, 0],
              [1, 1],
            ],
          ],
        }),
      ).toBe(false);
      expect(Array.from(builder.build().shapePolygonOffsets)).toEqual([0]);
      warn.mockRestore();
    });

    it("skips a geometry that is not a polygon", () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const builder = new ShapesGeometryBuilder();
      expect(builder.addGeometry({ type: "Point", coordinates: [0, 0] })).toBe(
        false,
      );
      expect(Array.from(builder.build().shapePolygonOffsets)).toEqual([0]);
      warn.mockRestore();
    });
  });
});
