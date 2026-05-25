import { describe, expect, it, vi } from "vitest";

import { type DefaultMap } from "../../model/types";
import { type TableData } from "../../storage/table";
import { OpacityDataUtils } from "./OpacityDataUtils";

function createMockTableData(
  ids: number[],
  values: unknown[],
  valueRange?: [number, number],
): TableData {
  return {
    getIds: () => ids,
    getSize: () => ids.length,
    getNames: () => undefined,
    close: vi.fn(),
    loadValues: vi.fn().mockResolvedValue(values),
    loadValueRange: vi.fn().mockResolvedValue(valueRange),
    loadUniqueValues: vi.fn().mockResolvedValue(Array.from(new Set(values))),
    suggestColumnQueries: vi.fn(),
    resolveColumnQuery: vi.fn(),
  };
}

describe("OpacityDataUtils", () => {
  describe("encodeOpacity", () => {
    it("converts 0–1 opacity to 0–255", () => {
      expect(OpacityDataUtils.encodeOpacity(0)).toBe(0);
      expect(OpacityDataUtils.encodeOpacity(1)).toBe(255);
      expect(OpacityDataUtils.encodeOpacity(0.5)).toBe(128);
    });

    it("applies opacityFactor", () => {
      expect(OpacityDataUtils.encodeOpacity(1, { opacityFactor: 0.5 })).toBe(
        128,
      );
      expect(OpacityDataUtils.encodeOpacity(0.5, { opacityFactor: 0.5 })).toBe(
        64,
      );
    });

    it("clamps to 0–255 range", () => {
      expect(OpacityDataUtils.encodeOpacity(2)).toBe(255);
      expect(OpacityDataUtils.encodeOpacity(-1)).toBe(0);
    });
  });

  describe("parseOpacityValue", () => {
    it("clamps numeric values to [0, 1]", () => {
      expect(OpacityDataUtils.parseOpacityValue(0.5)).toBe(0.5);
      expect(OpacityDataUtils.parseOpacityValue(-0.5)).toBe(0);
      expect(OpacityDataUtils.parseOpacityValue(1.5)).toBe(1);
    });

    it("returns undefined for non-number values", () => {
      expect(OpacityDataUtils.parseOpacityValue("abc")).toBeUndefined();
      expect(OpacityDataUtils.parseOpacityValue(null)).toBeUndefined();
    });
  });

  describe("createUniformOpacityData", () => {
    it("creates a buffer filled with the encoded opacity", () => {
      const data = OpacityDataUtils.createUniformOpacityData(3, 0.5);
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(3);
      const expected = OpacityDataUtils.encodeOpacity(0.5);
      for (let i = 0; i < 3; i++) {
        expect(data[i]).toBe(expected);
      }
    });

    it("respects alignment", () => {
      const data = OpacityDataUtils.createUniformOpacityData(3, 1, {
        align: 4,
      });
      expect(data.length).toBe(4);
    });

    it("applies opacityFactor", () => {
      const data = OpacityDataUtils.createUniformOpacityData(2, 1, {
        opacityFactor: 0.5,
      });
      expect(data[0]).toBe(128);
    });
  });

  describe("loadConstantOpacityData", () => {
    it("fills buffer with constant opacity", () => {
      const config = {
        source: "constant" as const,
        constant: { value: 0.75 },
      };
      const data = OpacityDataUtils.loadUniformOpacityData([1, 2], config);
      const expected = OpacityDataUtils.encodeOpacity(0.75);
      expect(data[0]).toBe(expected);
      expect(data[1]).toBe(expected);
    });
  });

  describe("loadFromOpacityData", () => {
    it("reads opacity values from a table column", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, [0.3, 0.8]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { column: "col1" },
      };

      const data = await OpacityDataUtils.loadOpacityDataFromTableValues(
        ids,
        config,
        1,
        loadTable,
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.3));
      expect(data[1]).toBe(OpacityDataUtils.encodeOpacity(0.8));
    });

    it("uses default opacity for invalid values", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["bad"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { column: "col1" },
      };

      const data = await OpacityDataUtils.loadOpacityDataFromTableValues(
        ids,
        config,
        0.5,
        loadTable,
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.5));
    });
  });

  describe("loadGroupByOpacityData", () => {
    it("uses opacity map when found", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["high", "low"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "Opacity Map 1",
        values: {
          [JSON.stringify("high")]: 0.9,
          [JSON.stringify("low")]: 0.1,
        },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { column: "col1", map: "om1" },
      };

      const data = await OpacityDataUtils.loadOpacityDataFromTableGroups(
        ids,
        config,
        [opacityMap],
        1,
        loadTable,
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.9));
      expect(data[1]).toBe(OpacityDataUtils.encodeOpacity(0.1));
    });

    it("uses map default when group is unmapped", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["unknown"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "OM",
        values: {},
        default: 0.42,
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { column: "col1", map: "om1" },
      };

      const data = await OpacityDataUtils.loadOpacityDataFromTableGroups(
        ids,
        config,
        [opacityMap],
        1,
        loadTable,
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.42));
    });

    it("returns uniform default when map is not found", async () => {
      const ids = [1];
      const config = {
        source: "groupBy" as const,
        groupBy: { column: "col1", map: "nonexistent" },
      };

      const data = await OpacityDataUtils.loadOpacityDataFromTableGroups(
        ids,
        config,
        [],
        0.5,
        vi.fn(),
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.5));
    });
  });

  describe("loadOpacityData", () => {
    it("dispatches to constant config", async () => {
      const config = {
        source: "constant" as const,
        constant: { value: 0.8 },
      };

      const data = await OpacityDataUtils.loadOpacityData(
        [1],
        config,
        [],
        1,
        vi.fn(),
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.8));
    });

    it("dispatches to from config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, [0.6]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { column: "col1" },
      };

      const data = await OpacityDataUtils.loadOpacityData(
        ids,
        config,
        [],
        1,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.6));
    });

    it("dispatches to groupBy config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["grp"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const opacityMap: DefaultMap<number> = {
        id: "om1",
        name: "OM",
        values: { [JSON.stringify("grp")]: 0.7 },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { column: "col1", map: "om1" },
      };

      const data = await OpacityDataUtils.loadOpacityData(
        ids,
        config,
        [opacityMap],
        1,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.7));
    });

    it("falls back to default opacity for invalid config", async () => {
      const data = await OpacityDataUtils.loadOpacityData(
        [1],
        {} as never,
        [],
        0.5,
        vi.fn(),
      );

      expect(data[0]).toBe(OpacityDataUtils.encodeOpacity(0.5));
    });

    it("applies opacityFactor", async () => {
      const config = {
        source: "constant" as const,
        constant: { value: 1 },
      };

      const data = await OpacityDataUtils.loadOpacityData(
        [1],
        config,
        [],
        1,
        vi.fn(),
        { opacityFactor: 0.5 },
      );

      expect(data[0]).toBe(
        OpacityDataUtils.encodeOpacity(1, { opacityFactor: 0.5 }),
      );
    });

    it("throws when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        OpacityDataUtils.loadOpacityData(
          [1],
          { source: "constant" as const, constant: { value: 1 } },
          [],
          1,
          vi.fn(),
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
    });
  });
});
