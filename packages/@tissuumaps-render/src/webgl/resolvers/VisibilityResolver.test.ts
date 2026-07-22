import { describe, expect, it, vi } from "vitest";

import type { DefaultMap, TableData, VisibilityConfig } from "@tissuumaps/core";

import { VisibilityResolver } from "./VisibilityResolver";

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

describe("VisibilityResolver", () => {
  describe("parseVisibility", () => {
    it("treats positive numbers as visible", () => {
      expect(VisibilityResolver.parseVisibility(1)).toBe(true);
      expect(VisibilityResolver.parseVisibility(5)).toBe(true);
    });

    it("treats zero and negatives as not visible", () => {
      expect(VisibilityResolver.parseVisibility(0)).toBe(false);
      expect(VisibilityResolver.parseVisibility(-1)).toBe(false);
    });

    it("returns undefined for non-number values", () => {
      expect(VisibilityResolver.parseVisibility("1")).toBeUndefined();
      expect(VisibilityResolver.parseVisibility(true)).toBeUndefined();
    });
  });

  describe("encodeVisibility", () => {
    it("encodes booleans as 1 or 0", () => {
      expect(VisibilityResolver.encodeVisibility(true)).toBe(1);
      expect(VisibilityResolver.encodeVisibility(false)).toBe(0);
    });
  });

  describe("createVisibilityBuffer", () => {
    it("creates a zeroed Uint8Array of the requested size", () => {
      const data = VisibilityResolver.createVisibilityBuffer(3);
      expect(data).toBeInstanceOf(Uint8Array);
      expect(Array.from(data)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(
        VisibilityResolver.createVisibilityBuffer(3, { align: 4 }).length,
      ).toBe(4);
    });
  });

  describe("createUniformVisibilities", () => {
    it("fills the buffer with the encoded visibility", () => {
      expect(
        Array.from(VisibilityResolver.createUniformVisibilities(3, true)),
      ).toEqual([1, 1, 1]);
      expect(
        Array.from(VisibilityResolver.createUniformVisibilities(2, false)),
      ).toEqual([0, 0]);
    });
  });

  describe("resolveUniformVisibilities", () => {
    it("fills the buffer with the constant visibility", () => {
      const config = { constant: { value: true } } satisfies VisibilityConfig;
      const data = VisibilityResolver.resolveUniformVisibilities(
        [1, 2],
        config,
      );
      expect(Array.from(data)).toEqual([1, 1]);
    });
  });

  describe("resolveVisibilitiesFromTableValues", () => {
    it("reads visibilities from the table column", async () => {
      const ids = [1, 2, 3];
      const tableData = createMockTableData(ids, [1, 0, 5]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      const data = await VisibilityResolver.resolveVisibilitiesFromTableValues(
        ids,
        config,
        false,
        loadTable,
      );

      expect(Array.from(data)).toEqual([1, 0, 1]);
    });

    it("uses the default visibility for invalid values", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["bad", 0]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      const data = await VisibilityResolver.resolveVisibilitiesFromTableValues(
        ids,
        config,
        true,
        loadTable,
      );

      expect(data[0]).toBe(1); // "bad" → default true
      expect(data[1]).toBe(0);
    });
  });

  describe("resolveVisibilitiesFromTableGroups", () => {
    it("maps groups to visibilities using the visibility map", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["A", "B"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const visibilityMap: DefaultMap<boolean> = {
        id: "vm1",
        name: "Visibility Map",
        values: {
          [JSON.stringify("A")]: true,
          [JSON.stringify("B")]: false,
        },
      };
      const config = {
        groupBy: { column: "col1", map: "vm1" },
      } satisfies VisibilityConfig;

      const data = await VisibilityResolver.resolveVisibilitiesFromTableGroups(
        ids,
        config,
        [visibilityMap],
        false,
        loadTable,
      );

      expect(Array.from(data)).toEqual([1, 0]);
    });

    it("returns uniform default visibility when the map is not found", async () => {
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies VisibilityConfig;

      const data = await VisibilityResolver.resolveVisibilitiesFromTableGroups(
        [1, 2],
        config,
        [],
        true,
        vi.fn(),
      );

      expect(Array.from(data)).toEqual([1, 1]);
    });
  });

  describe("resolveVisibilities", () => {
    it("dispatches to constant", async () => {
      const config = { constant: { value: false } } satisfies VisibilityConfig;
      const data = await VisibilityResolver.resolveVisibilities(
        [1, 2],
        config,
        [],
        true,
        vi.fn(),
      );
      expect(Array.from(data)).toEqual([0, 0]);
    });

    it("dispatches to from config when a table is given", async () => {
      const tableData = createMockTableData([1], [1]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      const data = await VisibilityResolver.resolveVisibilities(
        [1],
        config,
        [],
        false,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(1);
    });

    it("dispatches to groupBy config when a table is given", async () => {
      const tableData = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const visibilityMap: DefaultMap<boolean> = {
        id: "vm1",
        name: "Visibility Map",
        values: { [JSON.stringify("A")]: true },
      };
      const config = {
        groupBy: { column: "col1", map: "vm1" },
      } satisfies VisibilityConfig;

      const data = await VisibilityResolver.resolveVisibilities(
        [1],
        config,
        [visibilityMap],
        false,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(1);
    });

    it("falls back to the default visibility when the config has no active source", async () => {
      const config = {} as VisibilityConfig;
      const data = await VisibilityResolver.resolveVisibilities(
        [1, 2],
        config,
        [],
        true,
        vi.fn(),
      );
      expect(Array.from(data)).toEqual([1, 1]);
    });

    it("does not load the table for a from config without a table id", async () => {
      const loadTable = vi.fn();
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      const data = await VisibilityResolver.resolveVisibilities(
        [1],
        config,
        [],
        true,
        loadTable,
      );

      expect(loadTable).not.toHaveBeenCalled();
      expect(data[0]).toBe(1);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = { constant: { value: true } } satisfies VisibilityConfig;

      await expect(
        VisibilityResolver.resolveVisibilities(
          [1],
          config,
          [],
          false,
          vi.fn(),
          {
            signal: controller.signal,
          },
        ),
      ).rejects.toThrow();
    });
  });
});
