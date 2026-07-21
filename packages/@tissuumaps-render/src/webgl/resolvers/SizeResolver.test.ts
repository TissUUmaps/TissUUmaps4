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

    it("returns undefined for non-number values", () => {
      expect(SizeResolver.parseSize("5")).toBeUndefined();
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
      const data = SizeResolver.createSizeBuffer(3);
      expect(data).toBeInstanceOf(Float32Array);
      expect(Array.from(data)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(SizeResolver.createSizeBuffer(3, { align: 4 }).length).toBe(4);
    });
  });

  describe("createUniformSizes", () => {
    it("fills the buffer with the encoded size", () => {
      const data = SizeResolver.createUniformSizes(3, 7);
      expect(Array.from(data)).toEqual([7, 7, 7]);
    });

    it("applies the size factor while filling", () => {
      const data = SizeResolver.createUniformSizes(2, 4, { sizeFactor: 3 });
      expect(Array.from(data)).toEqual([12, 12]);
    });
  });

  describe("resolveUniformSizes", () => {
    it("fills the buffer with the constant size", () => {
      const config = { constant: { value: 9 } } satisfies SizeConfig;
      const data = SizeResolver.resolveUniformSizes([1, 2], config);
      expect(Array.from(data)).toEqual([9, 9]);
    });

    it("applies the size factor to the constant size", () => {
      const config = { constant: { value: 9 } } satisfies SizeConfig;
      const data = SizeResolver.resolveUniformSizes([1], config, {
        sizeFactor: 2,
      });
      expect(data[0]).toBe(18);
    });
  });

  describe("resolveSizesFromTableValues", () => {
    it("reads sizes from the table column and scales them", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, [3, 4]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const data = await SizeResolver.resolveSizesFromTableValues(
        ids,
        config,
        1,
        loadTable,
        { sizeFactor: 2 },
      );

      expect(data[0]).toBe(6);
      expect(data[1]).toBe(8);
    });

    it("uses the default size for invalid values", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["bad", 4]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const data = await SizeResolver.resolveSizesFromTableValues(
        ids,
        config,
        99,
        loadTable,
      );

      expect(data[0]).toBe(99);
      expect(data[1]).toBe(4);
    });
  });

  describe("resolveSizesFromTableGroups", () => {
    it("maps groups to sizes using the size map", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["A", "B"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
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

      const data = await SizeResolver.resolveSizesFromTableGroups(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
      );

      expect(data[0]).toBe(2);
      expect(data[1]).toBe(4);
    });

    it("uses the size map default for unmapped groups", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["missing"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "Size Map",
        values: {},
        default: 7,
      };
      const config = {
        groupBy: { column: "col1", map: "sm1" },
      } satisfies SizeConfig;

      const data = await SizeResolver.resolveSizesFromTableGroups(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
      );

      expect(data[0]).toBe(7);
    });

    it("returns uniform default size when the map is not found", async () => {
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies SizeConfig;

      const data = await SizeResolver.resolveSizesFromTableGroups(
        [1, 2],
        config,
        [],
        5,
        vi.fn(),
      );

      expect(Array.from(data)).toEqual([5, 5]);
    });
  });

  describe("resolveSizes", () => {
    it("dispatches to constant", async () => {
      const config = { constant: { value: 8 } } satisfies SizeConfig;
      const data = await SizeResolver.resolveSizes(
        [1, 2],
        config,
        [],
        1,
        vi.fn(),
      );
      expect(Array.from(data)).toEqual([8, 8]);
    });

    it("dispatches to from config when a table is given", async () => {
      const tableData = createMockTableData([1], [3]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const data = await SizeResolver.resolveSizes(
        [1],
        config,
        [],
        1,
        loadTable,
        {
          table: "t1",
        },
      );

      expect(data[0]).toBe(3);
    });

    it("dispatches to groupBy config when a table is given", async () => {
      const tableData = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "Size Map",
        values: { [JSON.stringify("A")]: 5 },
      };
      const config = {
        groupBy: { column: "col1", map: "sm1" },
      } satisfies SizeConfig;

      const data = await SizeResolver.resolveSizes(
        [1],
        config,
        [sizeMap],
        1,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(5);
    });

    it("falls back to the default size when the config has no active source", async () => {
      const config = {} as SizeConfig;
      const data = await SizeResolver.resolveSizes(
        [1, 2],
        config,
        [],
        3,
        vi.fn(),
      );
      expect(Array.from(data)).toEqual([3, 3]);
    });

    it("does not load the table for a from config without a table id", async () => {
      const loadTable = vi.fn();
      const config = { from: { column: "col1" } } satisfies SizeConfig;

      const data = await SizeResolver.resolveSizes(
        [1],
        config,
        [],
        3,
        loadTable,
      );

      expect(loadTable).not.toHaveBeenCalled();
      expect(data[0]).toBe(3);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = { constant: { value: 8 } } satisfies SizeConfig;

      await expect(
        SizeResolver.resolveSizes([1], config, [], 1, vi.fn(), {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
