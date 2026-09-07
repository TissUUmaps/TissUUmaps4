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

    it("passes booleans through", () => {
      expect(VisibilityResolver.parseVisibility(true)).toBe(true);
      expect(VisibilityResolver.parseVisibility(false)).toBe(false);
    });

    it("parses numeric strings", () => {
      expect(VisibilityResolver.parseVisibility("1")).toBe(true);
      expect(VisibilityResolver.parseVisibility("0")).toBe(false);
    });

    it("returns undefined for values that are not finite numbers", () => {
      expect(VisibilityResolver.parseVisibility("yes")).toBeUndefined();
      expect(VisibilityResolver.parseVisibility(NaN)).toBeUndefined();
      expect(VisibilityResolver.parseVisibility(null)).toBeUndefined();
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
      const buffer = VisibilityResolver.createVisibilityBuffer(3);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(Array.from(buffer)).toEqual([0, 0, 0]);
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
      const buffer = VisibilityResolver.resolveUniformVisibilities(
        [1, 2],
        config,
      );
      expect(Array.from(buffer)).toEqual([1, 1]);
    });
  });

  describe("resolveVisibilitiesFromTableValues", () => {
    it("reads visibilities from the table column", async () => {
      const ids = [1, 2, 3];
      const data = createMockTableData(ids, [1, 0, 5]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      const buffer =
        await VisibilityResolver.resolveVisibilitiesFromTableValues(
          ids,
          config,
          false,
          loadTable,
        );

      expect(Array.from(buffer)).toEqual([1, 0, 1]);
    });

    it("uses the default visibility for invalid values", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["bad", 0]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      const buffer =
        await VisibilityResolver.resolveVisibilitiesFromTableValues(
          ids,
          config,
          true,
          loadTable,
        );

      expect(buffer[0]).toBe(1); // "bad" → default true
      expect(buffer[1]).toBe(0);
    });

    it("forwards the signal to loadTable", async () => {
      const controller = new AbortController();
      const data = createMockTableData([1], [1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      await VisibilityResolver.resolveVisibilitiesFromTableValues(
        [1],
        config,
        false,
        loadTable,
        { signal: controller.signal },
      );

      expect(loadTable).toHaveBeenCalledWith({ signal: controller.signal });
    });
  });

  describe("resolveVisibilitiesFromTableGroups", () => {
    it("maps groups to visibilities using the visibility map", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["A", "B"]);
      const loadTable = vi.fn().mockResolvedValue(data);
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

      const buffer =
        await VisibilityResolver.resolveVisibilitiesFromTableGroups(
          ids,
          config,
          [visibilityMap],
          false,
          loadTable,
        );

      expect(Array.from(buffer)).toEqual([1, 0]);
    });

    it("uses the visibility map default for unmapped groups", async () => {
      const ids = [1];
      const data = createMockTableData(ids, ["missing"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const visibilityMap: DefaultMap<boolean> = {
        id: "vm1",
        name: "Visibility Map",
        values: {},
        default: true,
      };
      const config = {
        groupBy: { column: "col1", map: "vm1" },
      } satisfies VisibilityConfig;

      const buffer =
        await VisibilityResolver.resolveVisibilitiesFromTableGroups(
          ids,
          config,
          [visibilityMap],
          false,
          loadTable,
        );

      expect(buffer[0]).toBe(1);
    });

    it("returns uniform default visibility when the map is not found", async () => {
      const loadTable = vi.fn();
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies VisibilityConfig;

      const buffer =
        await VisibilityResolver.resolveVisibilitiesFromTableGroups(
          [1, 2],
          config,
          [],
          true,
          loadTable,
        );

      expect(Array.from(buffer)).toEqual([1, 1]);
      expect(loadTable).not.toHaveBeenCalled();
    });
  });

  describe("resolveVisibilities", () => {
    it("dispatches to constant", async () => {
      const config = { constant: { value: false } } satisfies VisibilityConfig;
      const buffer = await VisibilityResolver.resolveVisibilities(
        [1, 2],
        config,
        [],
        true,
      );
      expect(Array.from(buffer)).toEqual([0, 0]);
    });

    it("dispatches to from config when loadTable is given", async () => {
      const data = createMockTableData([1], [1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      const buffer = await VisibilityResolver.resolveVisibilities(
        [1],
        config,
        [],
        false,
        { loadTable },
      );

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(1);
    });

    it("dispatches to groupBy config when loadTable is given", async () => {
      const data = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const visibilityMap: DefaultMap<boolean> = {
        id: "vm1",
        name: "Visibility Map",
        values: { [JSON.stringify("A")]: true },
      };
      const config = {
        groupBy: { column: "col1", map: "vm1" },
      } satisfies VisibilityConfig;

      const buffer = await VisibilityResolver.resolveVisibilities(
        [1],
        config,
        [visibilityMap],
        false,
        { loadTable },
      );

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(1);
    });

    it("falls back to the default visibility when the config has no active source", async () => {
      const config = {} as VisibilityConfig;
      const buffer = await VisibilityResolver.resolveVisibilities(
        [1, 2],
        config,
        [],
        true,
      );
      expect(Array.from(buffer)).toEqual([1, 1]);
    });

    it("falls back to the default visibility for a from config without loadTable", async () => {
      const config = { from: { column: "col1" } } satisfies VisibilityConfig;

      const buffer = await VisibilityResolver.resolveVisibilities(
        [1],
        config,
        [],
        true,
      );

      expect(buffer[0]).toBe(1);
    });

    it("falls back to the default visibility for a groupBy config without loadTable", async () => {
      const visibilityMap: DefaultMap<boolean> = {
        id: "vm1",
        name: "Visibility Map",
        values: { [JSON.stringify("A")]: false },
      };
      const config = {
        groupBy: { column: "col1", map: "vm1" },
      } satisfies VisibilityConfig;

      const buffer = await VisibilityResolver.resolveVisibilities(
        [1],
        config,
        [visibilityMap],
        true,
        {},
      );

      expect(buffer[0]).toBe(1);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = { constant: { value: true } } satisfies VisibilityConfig;

      await expect(
        VisibilityResolver.resolveVisibilities([1], config, [], false, {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
