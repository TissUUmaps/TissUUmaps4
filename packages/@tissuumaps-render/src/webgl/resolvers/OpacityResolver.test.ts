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

    it("parses numeric strings", () => {
      expect(OpacityResolver.parseOpacity("0.5")).toBe(0.5);
    });

    it("returns undefined for values that are not finite numbers", () => {
      expect(OpacityResolver.parseOpacity("half")).toBeUndefined();
      expect(OpacityResolver.parseOpacity(NaN)).toBeUndefined();
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
      const buffer = OpacityResolver.createOpacityBuffer(3);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(Array.from(buffer)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(OpacityResolver.createOpacityBuffer(3, { align: 4 }).length).toBe(
        4,
      );
    });
  });

  describe("createUniformOpacities", () => {
    it("fills the buffer with the encoded opacity", () => {
      const buffer = OpacityResolver.createUniformOpacities(3, 1);
      expect(Array.from(buffer)).toEqual([255, 255, 255]);
    });

    it("applies the opacity factor while filling", () => {
      const buffer = OpacityResolver.createUniformOpacities(2, 1, {
        opacityFactor: 0.5,
      });
      expect(Array.from(buffer)).toEqual([128, 128]); // round(0.5*255)
    });
  });

  describe("resolveUniformOpacities", () => {
    it("fills the buffer with the constant opacity", () => {
      const config = { constant: { value: 1 } } satisfies OpacityConfig;
      const buffer = OpacityResolver.resolveUniformOpacities([1, 2], config);
      expect(Array.from(buffer)).toEqual([255, 255]);
    });
  });

  describe("resolveOpacitiesFromTableValues", () => {
    it("reads opacities from the table column", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacitiesFromTableValues(
        ids,
        config,
        1,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([0, 255]);
    });

    it("uses the default opacity for invalid values", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["bad", 1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacitiesFromTableValues(
        ids,
        config,
        0,
        loadTable,
      );

      expect(buffer[0]).toBe(0); // default 0 → encoded 0
      expect(buffer[1]).toBe(255);
    });

    it("forwards the signal to loadTable", async () => {
      const controller = new AbortController();
      const data = createMockTableData([1], [1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      await OpacityResolver.resolveOpacitiesFromTableValues(
        [1],
        config,
        1,
        loadTable,
        { signal: controller.signal },
      );

      expect(loadTable).toHaveBeenCalledWith({ signal: controller.signal });
    });
  });

  describe("resolveOpacitiesFromTableGroups", () => {
    it("maps groups to opacities using the opacity map", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["A", "B"]);
      const loadTable = vi.fn().mockResolvedValue(data);
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

      const buffer = await OpacityResolver.resolveOpacitiesFromTableGroups(
        ids,
        config,
        [opacityMap],
        0,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([255, 128]);
    });

    it("uses the opacity map default for unmapped groups", async () => {
      const ids = [1];
      const data = createMockTableData(ids, ["missing"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "Opacity Map",
        values: {},
        default: 1,
      };
      const config = {
        groupBy: { column: "col1", map: "om1" },
      } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacitiesFromTableGroups(
        ids,
        config,
        [opacityMap],
        0,
        loadTable,
      );

      expect(buffer[0]).toBe(255);
    });

    it("returns uniform default opacity when the map is not found", async () => {
      const loadTable = vi.fn();
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacitiesFromTableGroups(
        [1, 2],
        config,
        [],
        1,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([255, 255]);
      expect(loadTable).not.toHaveBeenCalled();
    });

    it("applies the opacity factor to the mapped opacities", async () => {
      const ids = [1];
      const data = createMockTableData(ids, ["A"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "Opacity Map",
        values: { [JSON.stringify("A")]: 1 },
      };
      const config = {
        groupBy: { column: "col1", map: "om1" },
      } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacitiesFromTableGroups(
        ids,
        config,
        [opacityMap],
        0,
        loadTable,
        { opacityFactor: 0.5 },
      );

      expect(buffer[0]).toBe(128);
    });
  });

  describe("resolveOpacities", () => {
    it("dispatches to constant", async () => {
      const config = { constant: { value: 1 } } satisfies OpacityConfig;
      const buffer = await OpacityResolver.resolveOpacities(
        [1, 2],
        config,
        [],
        0,
      );
      expect(Array.from(buffer)).toEqual([255, 255]);
    });

    it("dispatches to from config when loadTable is given", async () => {
      const data = createMockTableData([1], [0.5]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacities(
        [1],
        config,
        [],
        0,
        { loadTable },
      );

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(128);
    });

    it("dispatches to groupBy config when loadTable is given", async () => {
      const data = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "Opacity Map",
        values: { [JSON.stringify("A")]: 1 },
      };
      const config = {
        groupBy: { column: "col1", map: "om1" },
      } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacities(
        [1],
        config,
        [opacityMap],
        0,
        { loadTable },
      );

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(255);
    });

    it("passes the opacity factor on to the table-backed sources", async () => {
      const data = createMockTableData([1], [1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacities(
        [1],
        config,
        [],
        0,
        { loadTable, opacityFactor: 0.5 },
      );

      expect(buffer[0]).toBe(128);
    });

    it("falls back to the default opacity when the config has no active source", async () => {
      const config = {} as OpacityConfig;
      const buffer = await OpacityResolver.resolveOpacities(
        [1, 2],
        config,
        [],
        1,
      );
      expect(Array.from(buffer)).toEqual([255, 255]);
    });

    it("falls back to the default opacity for a from config without loadTable", async () => {
      const config = { from: { column: "col1" } } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacities([1], config, [], 1);

      expect(buffer[0]).toBe(255);
    });

    it("falls back to the default opacity for a groupBy config without loadTable", async () => {
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "Opacity Map",
        values: { [JSON.stringify("A")]: 0.5 },
      };
      const config = {
        groupBy: { column: "col1", map: "om1" },
      } satisfies OpacityConfig;

      const buffer = await OpacityResolver.resolveOpacities(
        [1],
        config,
        [opacityMap],
        1,
        {},
      );

      expect(buffer[0]).toBe(255);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = { constant: { value: 1 } } satisfies OpacityConfig;

      await expect(
        OpacityResolver.resolveOpacities([1], config, [], 0, {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
