import { describe, expect, it, vi } from "vitest";

import type { DefaultMap, OpacityConfig, TableData } from "@tissuumaps/core";

import { OpacityResolver } from "./OpacityResolver";

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

describe("OpacityResolver", () => {
  describe("parseOpacity", () => {
    it("returns numeric values within [0, 1] unchanged", () => {
      expect(OpacityResolver.parseOpacity(0.5)).toBe(0.5);
      expect(OpacityResolver.parseOpacity(0)).toBe(0);
      expect(OpacityResolver.parseOpacity(1)).toBe(1);
    });

    it("clamps out-of-range numbers to [0, 1]", () => {
      expect(OpacityResolver.parseOpacity(2)).toBe(1);
      expect(OpacityResolver.parseOpacity(-1)).toBe(0);
    });

    it("returns undefined for non-number values", () => {
      expect(OpacityResolver.parseOpacity("0.5")).toBeUndefined();
      expect(OpacityResolver.parseOpacity(null)).toBeUndefined();
    });
  });

  describe("encodeOpacity", () => {
    it("scales opacity (0–1) into the 0–255 range", () => {
      expect(OpacityResolver.encodeOpacity(0)).toBe(0);
      expect(OpacityResolver.encodeOpacity(1)).toBe(255);
      expect(OpacityResolver.encodeOpacity(0.5)).toBe(128); // round(127.5)
    });

    it("applies the opacity factor", () => {
      expect(OpacityResolver.encodeOpacity(0.5, { opacityFactor: 0.5 })).toBe(
        64,
      ); // round(0.5*0.5*255) = round(63.75)
    });

    it("clamps the encoded value to [0, 255]", () => {
      expect(OpacityResolver.encodeOpacity(1, { opacityFactor: 2 })).toBe(255);
      expect(OpacityResolver.encodeOpacity(-1)).toBe(0);
    });
  });

  describe("createOpacityBuffer", () => {
    it("creates a zeroed Uint8Array of the requested size", () => {
      const data = OpacityResolver.createOpacityBuffer(3);
      expect(data).toBeInstanceOf(Uint8Array);
      expect(Array.from(data)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(OpacityResolver.createOpacityBuffer(3, { align: 4 }).length).toBe(
        4,
      );
    });
  });

  describe("createUniformOpacities", () => {
    it("fills the buffer with the encoded opacity", () => {
      const data = OpacityResolver.createUniformOpacities(3, 1);
      expect(Array.from(data)).toEqual([255, 255, 255]);
    });

    it("applies the opacity factor while filling", () => {
      const data = OpacityResolver.createUniformOpacities(2, 1, {
        opacityFactor: 0.5,
      });
      expect(Array.from(data)).toEqual([128, 128]); // round(0.5*255)
    });
  });

  describe("resolveUniformOpacities", () => {
    it("fills the buffer with the constant opacity", () => {
      const config = { constant: { value: 1 } } satisfies OpacityConfig;
      const data = OpacityResolver.resolveUniformOpacities([1, 2], config);
      expect(Array.from(data)).toEqual([255, 255]);
    });
  });

  describe("resolveOpacitiesDataFromTableValues", () => {
    it("reads opacities from the table column", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const data = await OpacityResolver.resolveOpacitiesDataFromTableValues(
        ids,
        config,
        1,
        loadTable,
      );

      expect(data[0]).toBe(0);
      expect(data[1]).toBe(255);
    });

    it("uses the default opacity for invalid values", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["bad", 1]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const data = await OpacityResolver.resolveOpacitiesDataFromTableValues(
        ids,
        config,
        0,
        loadTable,
      );

      expect(data[0]).toBe(0); // default 0 → encoded 0
      expect(data[1]).toBe(255);
    });
  });

  describe("resolveOpacitiesFromTableGroups", () => {
    it("maps groups to opacities using the opacity map", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["A", "B"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "Opacity Map",
        values: {
          [JSON.stringify("A")]: 1,
          [JSON.stringify("B")]: 0.5,
        },
      };
      const config = {
        groupBy: { column: "col1", map: "om1" },
      } satisfies OpacityConfig;

      const data = await OpacityResolver.resolveOpacitiesFromTableGroups(
        ids,
        config,
        [opacityMap],
        0,
        loadTable,
      );

      expect(data[0]).toBe(255);
      expect(data[1]).toBe(128);
    });

    it("returns uniform default opacity when the map is not found", async () => {
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies OpacityConfig;

      const data = await OpacityResolver.resolveOpacitiesFromTableGroups(
        [1, 2],
        config,
        [],
        1,
        vi.fn(),
      );

      expect(Array.from(data)).toEqual([255, 255]);
    });
  });

  describe("resolveOpacities", () => {
    it("dispatches to constant", async () => {
      const config = { constant: { value: 1 } } satisfies OpacityConfig;
      const data = await OpacityResolver.resolveOpacities(
        [1, 2],
        config,
        [],
        0,
        vi.fn(),
      );
      expect(Array.from(data)).toEqual([255, 255]);
    });

    it("dispatches to from config when a table is given", async () => {
      const tableData = createMockTableData([1], [0.5]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const data = await OpacityResolver.resolveOpacities(
        [1],
        config,
        [],
        0,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(128);
    });

    it("dispatches to groupBy config when a table is given", async () => {
      const tableData = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "Opacity Map",
        values: { [JSON.stringify("A")]: 1 },
      };
      const config = {
        groupBy: { column: "col1", map: "om1" },
      } satisfies OpacityConfig;

      const data = await OpacityResolver.resolveOpacities(
        [1],
        config,
        [opacityMap],
        0,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(255);
    });

    it("falls back to the default opacity when the config has no active source", async () => {
      const config = {} as OpacityConfig;
      const data = await OpacityResolver.resolveOpacities(
        [1, 2],
        config,
        [],
        1,
        vi.fn(),
      );
      expect(Array.from(data)).toEqual([255, 255]);
    });

    it("does not load the table for a from config without a table id", async () => {
      const loadTable = vi.fn();
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const data = await OpacityResolver.resolveOpacities(
        [1],
        config,
        [],
        1,
        loadTable,
      );

      expect(loadTable).not.toHaveBeenCalled();
      expect(data[0]).toBe(255);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = { constant: { value: 1 } } satisfies OpacityConfig;

      await expect(
        OpacityResolver.resolveOpacities([1], config, [], 0, vi.fn(), {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
