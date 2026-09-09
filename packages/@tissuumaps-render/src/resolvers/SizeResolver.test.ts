import { describe, expect, it, vi } from "vitest";

import type { DefaultMap, SizeConfig, TableData } from "@tissuumaps/core";

import { SizeResolver } from "./SizeResolver";

function createMockTableData(ids: number[], values: unknown[]): TableData {
  return {
    getIds: () => ids,
    getSize: () => ids.length,
    getNames: () => undefined,
    close: vi.fn(),
    loadValues: vi.fn().mockResolvedValue(values),
    loadValueRange: vi.fn().mockResolvedValue(undefined),
    loadUniqueValues: vi.fn().mockResolvedValue(Array.from(new Set(values))),
    suggestColumnQueries: vi.fn(),
    resolveColumnQuery: vi.fn(),
  };
}

describe("SizeResolver", () => {
  describe("parseSize", () => {
    it("returns numeric values unchanged", () => {
      expect(SizeResolver.parseSize(5)).toBe(5);
      expect(SizeResolver.parseSize(0)).toBe(0);
      expect(SizeResolver.parseSize(-2.5)).toBe(-2.5);
    });

    it("parses numeric strings", () => {
      expect(SizeResolver.parseSize("5")).toBe(5);
      expect(SizeResolver.parseSize("-2.5")).toBe(-2.5);
    });

    it("returns undefined for values that are not finite numbers", () => {
      expect(SizeResolver.parseSize("five")).toBeUndefined();
      expect(SizeResolver.parseSize(NaN)).toBeUndefined();
      expect(SizeResolver.parseSize(Infinity)).toBeUndefined();
      expect(SizeResolver.parseSize(null)).toBeUndefined();
      expect(SizeResolver.parseSize(undefined)).toBeUndefined();
    });
  });

  describe("encodeSize", () => {
    it("returns the size unchanged by default", () => {
      expect(SizeResolver.encodeSize(10)).toBe(10);
    });

    it("scales the size by the size factor", () => {
      expect(SizeResolver.encodeSize(10, { sizeFactor: 2 })).toBe(20);
      expect(SizeResolver.encodeSize(10, { sizeFactor: 0.5 })).toBe(5);
    });
  });

  describe("createSizeBuffer", () => {
    it("creates a zeroed Float32Array of the requested size", () => {
      const buffer = SizeResolver.createSizeBuffer(3);
      expect(buffer).toBeInstanceOf(Float32Array);
      expect(Array.from(buffer)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(SizeResolver.createSizeBuffer(3, { align: 4 }).length).toBe(4);
    });
  });

  describe("createUniformSizes", () => {
    it("fills the buffer with the encoded size", () => {
      const buffer = SizeResolver.createUniformSizes(3, 7);
      expect(Array.from(buffer)).toEqual([7, 7, 7]);
    });

    it("applies the size factor while filling", () => {
      const buffer = SizeResolver.createUniformSizes(2, 4, { sizeFactor: 3 });
      expect(Array.from(buffer)).toEqual([12, 12]);
    });
  });

  describe("resolveUniformSizes", () => {
    it("fills the buffer with the constant size", () => {
      const config = { constant: { value: 9 } } satisfies SizeConfig;
      const buffer = SizeResolver.resolveUniformSizes([1, 2], config);
      expect(Array.from(buffer)).toEqual([9, 9]);
    });

    it("applies the size factor to the constant size", () => {
      const config = { constant: { value: 9 } } satisfies SizeConfig;
      const buffer = SizeResolver.resolveUniformSizes([1], config, {
        sizeFactor: 2,
      });
      expect(buffer[0]).toBe(18);
    });
  });

  describe("resolveSizesFromTableValues", () => {
    it("reads sizes from the table column and scales them", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, [3, 4]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizesFromTableValues(
        ids,
        config,
        1,
        loadTable,
        { sizeFactor: 2 },
      );

      expect(Array.from(buffer)).toEqual([6, 8]);
    });

    it("uses the default size for invalid values", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["bad", 4]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizesFromTableValues(
        ids,
        config,
        99,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([99, 4]);
    });

    it("forwards the signal to loadTable", async () => {
      const controller = new AbortController();
      const data = createMockTableData([1], [3]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      await SizeResolver.resolveSizesFromTableValues(
        [1],
        config,
        1,
        loadTable,
        { signal: controller.signal },
      );

      expect(loadTable).toHaveBeenCalledWith({ signal: controller.signal });
    });
  });

  describe("resolveSizesFromTableGroups", () => {
    it("maps groups to sizes using the size map", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["A", "B"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "Size Map",
        values: {
          [JSON.stringify("A")]: 2,
          [JSON.stringify("B")]: 4,
        },
      };
      const config = {
        groupBy: { column: "col1", map: "sm1" },
      } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizesFromTableGroups(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([2, 4]);
    });

    it("uses the size map default for unmapped groups", async () => {
      const ids = [1];
      const data = createMockTableData(ids, ["missing"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "Size Map",
        values: {},
        default: 7,
      };
      const config = {
        groupBy: { column: "col1", map: "sm1" },
      } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizesFromTableGroups(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
      );

      expect(buffer[0]).toBe(7);
    });

    it("returns uniform default size when the map is not found", async () => {
      const loadTable = vi.fn();
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizesFromTableGroups(
        [1, 2],
        config,
        [],
        5,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([5, 5]);
      expect(loadTable).not.toHaveBeenCalled();
    });

    it("applies the size factor to the mapped sizes", async () => {
      const ids = [1];
      const data = createMockTableData(ids, ["A"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "Size Map",
        values: { [JSON.stringify("A")]: 3 },
      };
      const config = {
        groupBy: { column: "col1", map: "sm1" },
      } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizesFromTableGroups(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
        { sizeFactor: 2 },
      );

      expect(buffer[0]).toBe(6);
    });
  });

  describe("resolveSizes", () => {
    it("dispatches to constant", async () => {
      const config = { constant: { value: 8 } } satisfies SizeConfig;
      const buffer = await SizeResolver.resolveSizes([1, 2], config, [], 1);
      expect(Array.from(buffer)).toEqual([8, 8]);
    });

    it("dispatches to from config when loadTable is given", async () => {
      const data = createMockTableData([1], [3]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizes([1], config, [], 1, {
        loadTable,
      });

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(3);
    });

    it("dispatches to groupBy config when loadTable is given", async () => {
      const data = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "Size Map",
        values: { [JSON.stringify("A")]: 5 },
      };
      const config = {
        groupBy: { column: "col1", map: "sm1" },
      } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizes(
        [1],
        config,
        [sizeMap],
        1,
        { loadTable },
      );

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(5);
    });

    it("passes the size factor on to the table-backed sources", async () => {
      const data = createMockTableData([1], [3]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizes([1], config, [], 1, {
        loadTable,
        sizeFactor: 2,
      });

      expect(buffer[0]).toBe(6);
    });

    it("falls back to the default size when the config has no active source", async () => {
      const config = {} as SizeConfig;
      const buffer = await SizeResolver.resolveSizes([1, 2], config, [], 3);
      expect(Array.from(buffer)).toEqual([3, 3]);
    });

    it("falls back to the default size for a from config without loadTable", async () => {
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizes([1], config, [], 3);

      expect(buffer[0]).toBe(3);
    });

    it("falls back to the default size for a groupBy config without loadTable", async () => {
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "Size Map",
        values: { [JSON.stringify("A")]: 5 },
      };
      const config = {
        groupBy: { column: "col1", map: "sm1" },
      } satisfies SizeConfig;

      const buffer = await SizeResolver.resolveSizes(
        [1],
        config,
        [sizeMap],
        3,
        {},
      );

      expect(buffer[0]).toBe(3);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = { constant: { value: 8 } } satisfies SizeConfig;

      await expect(
        SizeResolver.resolveSizes([1], config, [], 1, {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
