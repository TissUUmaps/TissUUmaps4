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
      const { geometry, ids, names } = await ShapesUtils.buildGeometry(
        (append) => {
          append([[square]], 7);
        },
      );
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4]);
      expect(Array.from(geometry.coords)).toEqual([0, 0, 4, 0, 4, 4, 0, 4]);
      expect(ids).toEqual([7]);
      expect(names).toBeUndefined();
    });

    it("appends the holes of a polygon as further rings", async () => {
      const { geometry } = await ShapesUtils.buildGeometry((append) => {
        append([[square, hole]], 0);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 2]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4, 7]);
    });

    it("appends several polygons as one shape", async () => {
      const { geometry } = await ShapesUtils.buildGeometry((append) => {
        append([[square], [square, hole]], 0);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 2]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1, 3]);
      expect(Array.from(geometry.ringVertexOffsets)).toEqual([0, 4, 8, 11]);
    });

    it("appends several shapes with their IDs and names", async () => {
      const { geometry, ids, names } = await ShapesUtils.buildGeometry(
        (append) => {
          append([[square]], 10, "first");
          append([[square]], 20, "second");
        },
      );
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1, 2]);
      expect(Array.from(geometry.polygonRingOffsets)).toEqual([0, 1, 2]);
      expect(ids).toEqual([10, 20]);
      expect(names).toEqual(["first", "second"]);
    });

    it("awaits an asynchronous callback", async () => {
      const { geometry } = await ShapesUtils.buildGeometry(async (append) => {
        await Promise.resolve();
        append([[square]], 0);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0, 1]);
    });

    it("skips a polygon without a valid shell", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { geometry, ids } = await ShapesUtils.buildGeometry((append) => {
        append(
          [
            [
              [
                [0, 0],
                [1, 1],
              ],
            ],
          ],
          7,
        );
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0]);
      expect(ids).toEqual([]);
      warn.mockRestore();
    });

    it("skips a shape without polygons", async () => {
      const { geometry, ids } = await ShapesUtils.buildGeometry((append) => {
        append([], 7);
      });
      expect(Array.from(geometry.shapePolygonOffsets)).toEqual([0]);
      expect(ids).toEqual([]);
    });

    it("keeps the IDs aligned with the geometry when a shape is skipped", async () => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      const { geometry, ids } = await ShapesUtils.buildGeometry((append) => {
        append([[square]], 10);
        append([], 20);
        append([[square]], 30);
      });
      expect(geometry.shapePolygonOffsets.length - 1).toBe(2);
      expect(ids).toEqual([10, 30]);
      warn.mockRestore();
    });

    it("reads no names when only some shapes are named", async () => {
      const { names } = await ShapesUtils.buildGeometry((append) => {
        append([[square]], 10, "first");
        append([[square]], 20);
      });
      expect(names).toBeUndefined();
    });

    it("rejects when the callback throws", async () => {
      await expect(
        ShapesUtils.buildGeometry(() => {
          throw new Error("decode failed");
        }),
      ).rejects.toThrow("decode failed");
    });
  });

  describe("createShapesData", () => {
    const geometry = {
      shapePolygonOffsets: new Uint32Array([0, 1, 2]),
      polygonRingOffsets: new Uint32Array([0, 1, 2]),
      ringVertexOffsets: new Uint32Array([0, 4, 8]),
      coords: new Float32Array(16),
    };

    it("reads back the IDs, the names and the size", () => {
      const data = ShapesUtils.createShapesData(geometry, [3, 4], ["a", "b"]);
      expect(data.getIds()).toEqual([3, 4]);
      expect(data.getNames?.()).toEqual(["a", "b"]);
      expect(data.getSize()).toBe(2);
    });

    it("reads no names when the shapes have none", () => {
      const data = ShapesUtils.createShapesData(geometry, [3, 4], undefined);
      expect(data.getNames?.()).toBeUndefined();
    });

    it("resolves the geometry it was created with", async () => {
      const data = ShapesUtils.createShapesData(geometry, [3, 4], undefined);
      await expect(data.loadGeometry()).resolves.toBe(geometry);
    });

    it("throws when the IDs do not match the geometry", () => {
      expect(() =>
        ShapesUtils.createShapesData(geometry, [3], undefined),
      ).toThrow("inconsistent sizes");
    });
  });
});
