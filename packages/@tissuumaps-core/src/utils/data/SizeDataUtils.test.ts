import { describe, expect, it, vi } from "vitest";

import { type DefaultMap } from "../../model/types";
import { type TableData } from "../../storage/table";
import { SizeDataUtils } from "./SizeDataUtils";

function createMockTableData(ids: number[], values: unknown[]): TableData {
  return {
    getIds: () => ids,
    getSize: () => ids.length,
    getNames: () => undefined,
    close: vi.fn(),
    loadValues: vi.fn().mockResolvedValue(values),
    loadValueRange: vi.fn().mockResolvedValue(undefined),
    suggestColumnQueries: vi.fn(),
    resolveColumnQuery: vi.fn(),
  };
}

describe("SizeDataUtils", () => {
  describe("encodeSize", () => {
    it("returns value scaled by sizeFactor", () => {
      expect(SizeDataUtils.encodeSize(5)).toBe(5);
      expect(SizeDataUtils.encodeSize(5, { sizeFactor: 2 })).toBe(10);
      expect(SizeDataUtils.encodeSize(3, { sizeFactor: 0.5 })).toBe(1.5);
    });
  });

  describe("parseSizeValue", () => {
    it("returns the value if it is a number", () => {
      expect(SizeDataUtils.parseSizeValue(42)).toBe(42);
      expect(SizeDataUtils.parseSizeValue(0)).toBe(0);
      expect(SizeDataUtils.parseSizeValue(-5)).toBe(-5);
    });

    it("returns undefined for non-number values", () => {
      expect(SizeDataUtils.parseSizeValue("abc")).toBeUndefined();
      expect(SizeDataUtils.parseSizeValue(null)).toBeUndefined();
      expect(SizeDataUtils.parseSizeValue(undefined)).toBeUndefined();
    });
  });

  describe("createUniformSizeData", () => {
    it("creates a buffer filled with the encoded size", () => {
      const data = SizeDataUtils.createUniformSizeData(3, 10);
      expect(data).toBeInstanceOf(Float32Array);
      expect(data.length).toBe(3);
      for (let i = 0; i < 3; i++) {
        expect(data[i]).toBe(10);
      }
    });

    it("respects alignment", () => {
      const data = SizeDataUtils.createUniformSizeData(3, 5, { align: 4 });
      expect(data.length).toBe(4);
    });

    it("applies sizeFactor", () => {
      const data = SizeDataUtils.createUniformSizeData(2, 10, {
        sizeFactor: 2,
      });
      expect(data[0]).toBe(20);
    });
  });

  describe("loadConstantSizeData", () => {
    it("fills buffer with constant size value", () => {
      const config = {
        source: "constant" as const,
        constant: { value: 7 },
      };
      const data = SizeDataUtils.loadUniformSizeData([1, 2], config);
      expect(data[0]).toBe(7);
      expect(data[1]).toBe(7);
    });

    it("applies sizeFactor", () => {
      const config = {
        source: "constant" as const,
        constant: { value: 5 },
      };
      const data = SizeDataUtils.loadUniformSizeData([1], config, {
        sizeFactor: 3,
      });
      expect(data[0]).toBe(15);
    });
  });

  describe("loadFromSizeData", () => {
    it("reads size values from a table column", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, [3.5, 7.0]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { column: "col1" },
      };

      const data = await SizeDataUtils.loadSizeDataFromTableValues(
        ids,
        config,
        1,
        loadTable,
      );

      expect(data[0]).toBeCloseTo(3.5);
      expect(data[1]).toBeCloseTo(7.0);
    });

    it("uses default size for invalid values", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["bad"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await SizeDataUtils.loadSizeDataFromTableValues(
        ids,
        config,
        5,
        loadTable,
      );

      expect(data[0]).toBe(5);
    });

    it("applies sizeFactor", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, [4]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await SizeDataUtils.loadSizeDataFromTableValues(
        ids,
        config,
        1,
        loadTable,
        { sizeFactor: 2 },
      );

      expect(data[0]).toBe(8);
    });
  });

  describe("loadGroupBySizeData", () => {
    it("uses size map when found", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["big", "small"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "Size Map 1",
        values: {
          [JSON.stringify("big")]: 20,
          [JSON.stringify("small")]: 5,
        },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "sm1" },
      };

      const data = await SizeDataUtils.loadSizeDataFromTableGroups(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
      );

      expect(data[0]).toBe(20);
      expect(data[1]).toBe(5);
    });

    it("uses map default when group is unmapped", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["unknown"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "SM",
        values: {},
        default: 42,
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "sm1" },
      };

      const data = await SizeDataUtils.loadSizeDataFromTableGroups(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
      );

      expect(data[0]).toBe(42);
    });

    it("returns uniform default when map is not found", async () => {
      const ids = [1];
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "nonexistent" },
      };

      const data = await SizeDataUtils.loadSizeDataFromTableGroups(
        ids,
        config,
        [],
        99,
        vi.fn(),
      );

      expect(data[0]).toBe(99);
    });

    it("applies sizeFactor", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["a"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "SM",
        values: { [JSON.stringify("a")]: 10 },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "sm1" },
      };

      const data = await SizeDataUtils.loadSizeDataFromTableGroups(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
        { sizeFactor: 3 },
      );

      expect(data[0]).toBe(30);
    });
  });

  describe("loadSizeData", () => {
    it("dispatches to constant config", async () => {
      const config = {
        source: "constant" as const,
        constant: { value: 12 },
      };

      const data = await SizeDataUtils.loadSizeData(
        [1],
        config,
        [],
        1,
        vi.fn(),
      );

      expect(data[0]).toBe(12);
    });

    it("dispatches to from config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, [25]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await SizeDataUtils.loadSizeData(
        ids,
        config,
        [],
        1,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(25);
    });

    it("dispatches to groupBy config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["grp"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const sizeMap: DefaultMap<number> = {
        id: "sm1",
        name: "SM",
        values: { [JSON.stringify("grp")]: 15 },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "sm1" },
      };

      const data = await SizeDataUtils.loadSizeData(
        ids,
        config,
        [sizeMap],
        1,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(15);
    });

    it("falls back to default for invalid config", async () => {
      const data = await SizeDataUtils.loadSizeData(
        [1],
        {} as never,
        [],
        77,
        vi.fn(),
      );

      expect(data[0]).toBe(77);
    });

    it("throws when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        SizeDataUtils.loadSizeData(
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
