import { describe, expect, it, vi } from "vitest";

import { type ShapesRing, ShapesUtils } from "./ShapesUtils";

const square: ShapesRing = [
  [0, 0],
  [4, 0],
  [4, 4],
  [0, 4],
];

const hole: ShapesRing = [
  [1, 1],
  [2, 1],
  [2, 2],
];

describe("ShapesUtils", () => {
  describe("buildGeometry", () => {
    it("appends a polygon as one shape with one ring", async () => {
      let appended;
      const geometry = await ShapesUtils.buildGeometry((append) => {
        appended = append([[square]]);
      });
      expect(appended).toBe(true);
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4]);
      expect(Array.from(geometry.coords)).toEqual([0, 0, 4, 0, 4, 4, 0, 4]);
    });

    it("appends the holes of a polygon as further rings", async () => {
      const geometry = await ShapesUtils.buildGeometry((append) => {
        append([[square, hole]]);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 2]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4, 7]);
    });

    it("appends several polygons as one shape", async () => {
      const geometry = await ShapesUtils.buildGeometry((append) => {
        append([[square], [square, hole]]);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 2]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1, 3]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4, 8, 11]);
    });

    it("appends several shapes", async () => {
      const geometry = await ShapesUtils.buildGeometry((append) => {
        append([[square]]);
        append([[square]]);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1, 2]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1, 2]);
    });

    it("awaits an asynchronous callback", async () => {
      const geometry = await ShapesUtils.buildGeometry(async (append) => {
        await Promise.resolve();
        append([[square]]);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1]);
    });

    it("skips a polygon without a valid shell", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      let appended;
      const geometry = await ShapesUtils.buildGeometry((append) => {
        appended = append([
          [
            [
              [0, 0],
              [1, 1],
            ],
          ],
        ]);
      });
      expect(appended).toBe(false);
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0]);
      warn.mockRestore();
    });

    it("skips a shape without polygons", async () => {
      const geometry = await ShapesUtils.buildGeometry((append) => {
        expect(append([])).toBe(false);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0]);
    });

    it("rejects when the callback throws", async () => {
      await expect(
        ShapesUtils.buildGeometry(() => {
          throw new Error("decode failed");
        }),
      ).rejects.toThrow("decode failed");
    });
  });
});
