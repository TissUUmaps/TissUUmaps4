import { describe, expect, it, vi } from "vitest";

import type { TableData } from "../../storage/table";
import { DataUtilsBase } from "./DataUtilsBase";

// DataUtilsBase methods are protected, so we create a subclass to expose them
class TestableDataUtils extends DataUtilsBase {
  static fillFrom(
    ...args: Parameters<typeof DataUtilsBase.fillDataFromTableValues>
  ) {
    return DataUtilsBase.fillDataFromTableValues(...args);
  }
  static fillGroupBy(
    ...args: Parameters<typeof DataUtilsBase.fillDataFromTableGroups>
  ) {
    return DataUtilsBase.fillDataFromTableGroups(...args);
  }
}

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

describe("DataUtilsBase", () => {
  describe("fillFromConfigData", () => {
    it("fills data from table values using parseTableValue and encodeValue", async () => {
      const ids = [1, 2, 3];
      const tableData = createMockTableData([1, 2, 3], [10, 20, 30], [10, 30]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const data = new Float32Array(3);

      await TestableDataUtils.fillFrom(
        data,
        ids,
        "col1",
        0,
        loadTable,
        (value) => (typeof value === "number" ? value : undefined),
        (v) => (v as number) * 2,
      );

      expect(loadTable).toHaveBeenCalledWith({ signal: undefined });
      expect(data[0]).toBe(20); // 10 * 2
      expect(data[1]).toBe(40); // 20 * 2
      expect(data[2]).toBe(60); // 30 * 2
    });

    it("uses defaultValue when parseTableValue returns undefined", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData([1, 2], ["bad", 5]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const data = new Float32Array(2);

      await TestableDataUtils.fillFrom(
        data,
        ids,
        "col1",
        99,
        loadTable,
        (value) => (typeof value === "number" ? value : undefined),
        (v) => v as number,
      );

      expect(data[0]).toBe(99); // "bad" failed parsing → default
      expect(data[1]).toBe(5);
    });

    it("uses defaultValue when ID is missing from table", async () => {
      const ids = [1, 2, 3];
      const tableData = createMockTableData([1, 3], [10, 30]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const data = new Float32Array(3);

      await TestableDataUtils.fillFrom(
        data,
        ids,
        "col1",
        -1,
        loadTable,
        (value) => (typeof value === "number" ? value : undefined),
        (v) => v as number,
      );

      expect(data[0]).toBe(10);
      expect(data[1]).toBe(-1); // ID 2 missing
      expect(data[2]).toBe(30);
    });

    it("passes value range to parseTableValue", async () => {
      const ids = [1];
      const tableData = createMockTableData([1], [50], [0, 100]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const data = new Float32Array(1);
      const parseTableValue = vi
        .fn<
          (
            value: unknown,
            range: [number, number] | undefined,
          ) => number | undefined
        >()
        .mockReturnValue(50);

      await TestableDataUtils.fillFrom(
        data,
        ids,
        "col1",
        0,
        loadTable,
        parseTableValue,
        (v) => v as number,
      );

      expect(parseTableValue).toHaveBeenCalledWith(50, [0, 100]);
    });

    it("throws when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const data = new Float32Array(1);

      await expect(
        TestableDataUtils.fillFrom(
          data,
          [1],
          "col1",
          0,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
    });
  });

  describe("fillGroupByConfigData", () => {
    it("fills data by grouping table values and mapping groups", async () => {
      const ids = [1, 2, 3];
      const tableData = createMockTableData([1, 2, 3], ["A", "B", "A"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const data = new Uint8Array(3);
      const mapGroupToValue = vi
        .fn<(group: string) => number | undefined>()
        .mockImplementation((group: string) => {
          if (group === JSON.stringify("A")) return 10;
          if (group === JSON.stringify("B")) return 20;
          return undefined;
        });

      await TestableDataUtils.fillGroupBy(
        data,
        ids,
        "col1",
        0,
        loadTable,
        mapGroupToValue,
        (v) => v as number,
      );

      expect(data[0]).toBe(10);
      expect(data[1]).toBe(20);
      expect(data[2]).toBe(10);
    });

    it("uses defaultValue when mapGroupToValue returns undefined", async () => {
      const ids = [1];
      const tableData = createMockTableData([1], ["unknown"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const data = new Uint8Array(1);

      await TestableDataUtils.fillGroupBy(
        data,
        ids,
        "col1",
        42,
        loadTable,
        () => undefined,
        (v) => v as number,
      );

      expect(data[0]).toBe(42);
    });

    it("uses defaultValue when ID is missing from table", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const data = new Uint8Array(2);

      await TestableDataUtils.fillGroupBy(
        data,
        ids,
        "col1",
        99,
        loadTable,
        () => 10,
        (v) => v as number,
      );

      expect(data[0]).toBe(10);
      expect(data[1]).toBe(99); // ID 2 missing
    });

    it("JSON-stringifies group values before mapping", async () => {
      const ids = [1];
      const tableData = createMockTableData([1], [42]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const data = new Uint8Array(1);
      const mapGroupToValue = vi
        .fn<(group: string) => number | undefined>()
        .mockReturnValue(1);

      await TestableDataUtils.fillGroupBy(
        data,
        ids,
        "col1",
        0,
        loadTable,
        mapGroupToValue,
        (v) => v as number,
      );

      // numeric 42 becomes "42" after JSON.stringify
      expect(mapGroupToValue).toHaveBeenCalledWith("42");
    });

    it("throws when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const data = new Uint8Array(1);

      await expect(
        TestableDataUtils.fillGroupBy(
          data,
          [1],
          "col1",
          0,
          vi.fn(),
          vi.fn(),
          vi.fn(),
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
    });
  });
});
