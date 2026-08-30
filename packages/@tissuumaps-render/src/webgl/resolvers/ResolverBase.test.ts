import { type Mock, describe, expect, it, vi } from "vitest";

import type { TableData } from "@tissuumaps/core";

import { ResolverBase } from "./ResolverBase";

/**
 * Creates table data backed by mocks, returned alongside the loaders so that
 * assertions do not have to reference the methods through `data`
 */
function createMockTableData(
  ids: number[],
  values: unknown[],
  valueRange?: [number, number],
): { data: TableData; loadValues: Mock; loadValueRange: Mock } {
  const loadValues = vi.fn().mockResolvedValue(values);
  const loadValueRange = vi.fn().mockResolvedValue(valueRange);
  return {
    data: {
      getIds: () => ids,
      getSize: () => ids.length,
      getNames: () => undefined,
      close: vi.fn(),
      loadValues,
      loadValueRange,
      loadUniqueValues: vi.fn().mockResolvedValue(Array.from(new Set(values))),
      suggestColumnQueries: vi.fn(),
      resolveColumnQuery: vi.fn(),
    },
    loadValues,
    loadValueRange,
  };
}

describe("ResolverBase", () => {
  describe("fillFromTableValues", () => {
    it("fills the buffer from table values using parseTableValue and encodeValue", async () => {
      const ids = [1, 2, 3];
      const { data } = createMockTableData([1, 2, 3], [10, 20, 30], [10, 30]);
      const buffer = new Float32Array(3);

      await ResolverBase.fillFromTableValues(
        buffer,
        data,
        ids,
        "col1",
        0,
        (value) => (typeof value === "number" ? value : undefined),
        (value) => value * 2,
      );

      expect(Array.from(buffer)).toEqual([20, 40, 60]);
    });

    it("loads the column values and value range from the given table data", async () => {
      const { data, loadValues, loadValueRange } = createMockTableData(
        [1],
        [10],
        [0, 10],
      );
      const buffer = new Float32Array(1);

      await ResolverBase.fillFromTableValues(
        buffer,
        data,
        [1],
        "col1",
        0,
        (value) => (typeof value === "number" ? value : undefined),
        (value) => value,
      );

      expect(loadValues).toHaveBeenCalledWith("col1", {
        signal: undefined,
      });
      expect(loadValueRange).toHaveBeenCalledWith("col1", {
        signal: undefined,
      });
    });

    it("forwards the signal to the table data loads", async () => {
      const controller = new AbortController();
      const { data, loadValues, loadValueRange } = createMockTableData(
        [1],
        [10],
        [0, 10],
      );
      const buffer = new Float32Array(1);

      await ResolverBase.fillFromTableValues(
        buffer,
        data,
        [1],
        "col1",
        0,
        (value) => (typeof value === "number" ? value : undefined),
        (value) => value,
        { signal: controller.signal },
      );

      expect(loadValues).toHaveBeenCalledWith("col1", {
        signal: controller.signal,
      });
      expect(loadValueRange).toHaveBeenCalledWith("col1", {
        signal: controller.signal,
      });
    });

    it("uses defaultValue when parseTableValue returns undefined", async () => {
      const ids = [1, 2];
      const { data } = createMockTableData([1, 2], ["bad", 5]);
      const buffer = new Float32Array(2);

      await ResolverBase.fillFromTableValues(
        buffer,
        data,
        ids,
        "col1",
        99,
        (value) => (typeof value === "number" ? value : undefined),
        (value) => value,
      );

      expect(buffer[0]).toBe(99); // "bad" failed parsing → default
      expect(buffer[1]).toBe(5);
    });

    it("uses defaultValue when the ID is missing from the table data", async () => {
      const ids = [1, 2, 3];
      const { data } = createMockTableData([1, 3], [10, 30]);
      const buffer = new Float32Array(3);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await ResolverBase.fillFromTableValues(
        buffer,
        data,
        ids,
        "col1",
        -1,
        (value) => (typeof value === "number" ? value : undefined),
        (value) => value,
      );

      expect(buffer[0]).toBe(10);
      expect(buffer[1]).toBe(-1); // ID 2 missing
      expect(buffer[2]).toBe(30);
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });

    it("matches table rows by ID rather than by position", async () => {
      const { data } = createMockTableData([3, 1, 2], [30, 10, 20]);
      const buffer = new Float32Array(3);

      await ResolverBase.fillFromTableValues(
        buffer,
        data,
        [1, 2, 3],
        "col1",
        0,
        (value) => (typeof value === "number" ? value : undefined),
        (value) => value,
      );

      expect(Array.from(buffer)).toEqual([10, 20, 30]);
    });

    it("passes the loaded value range to parseTableValue", async () => {
      const { data } = createMockTableData([1], [50], [0, 100]);
      const buffer = new Float32Array(1);
      const parseTableValue = vi
        .fn<
          (
            value: unknown,
            valueRange: [number, number] | undefined,
          ) => number | undefined
        >()
        .mockReturnValue(50);

      await ResolverBase.fillFromTableValues(
        buffer,
        data,
        [1],
        "col1",
        0,
        parseTableValue,
        (value) => value,
      );

      expect(parseTableValue).toHaveBeenCalledWith(50, [0, 100]);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const { data, loadValues } = createMockTableData([1], [10]);
      const buffer = new Float32Array(1);

      await expect(
        ResolverBase.fillFromTableValues(
          buffer,
          data,
          [1],
          "col1",
          0,
          vi.fn(),
          vi.fn(),
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
      expect(loadValues).not.toHaveBeenCalled();
    });
  });

  describe("fillFromTableGroups", () => {
    it("fills the buffer by grouping table values and mapping groups", async () => {
      const ids = [1, 2, 3];
      const { data } = createMockTableData([1, 2, 3], ["A", "B", "A"]);
      const buffer = new Uint8Array(3);
      const mapGroupToValue = vi
        .fn<(group: string) => number | undefined>()
        .mockImplementation((group) => {
          if (group === JSON.stringify("A")) return 10;
          if (group === JSON.stringify("B")) return 20;
          return undefined;
        });

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        ids,
        "col1",
        0,
        mapGroupToValue,
        (value) => value,
      );

      expect(Array.from(buffer)).toEqual([10, 20, 10]);
    });

    it("loads the column values from the given table data", async () => {
      const { data, loadValues, loadValueRange } = createMockTableData(
        [1],
        ["A"],
      );
      const buffer = new Uint8Array(1);

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        [1],
        "col1",
        0,
        () => 10,
        (value) => value,
      );

      expect(loadValues).toHaveBeenCalledWith("col1", {
        signal: undefined,
      });
      // Groups never need a value range
      expect(loadValueRange).not.toHaveBeenCalled();
    });

    it("forwards the signal to the table data load", async () => {
      const controller = new AbortController();
      const { data, loadValues } = createMockTableData([1], ["A"]);
      const buffer = new Uint8Array(1);

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        [1],
        "col1",
        0,
        () => 10,
        (value) => value,
        { signal: controller.signal },
      );

      expect(loadValues).toHaveBeenCalledWith("col1", {
        signal: controller.signal,
      });
    });

    it("uses defaultValue when mapGroupToValue returns undefined", async () => {
      const { data } = createMockTableData([1], ["unknown"]);
      const buffer = new Uint8Array(1);

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        [1],
        "col1",
        42,
        () => undefined,
        (value) => value,
      );

      expect(buffer[0]).toBe(42);
    });

    it("uses defaultValue when the ID is missing from the table data", async () => {
      const ids = [1, 2];
      const { data } = createMockTableData([1], ["A"]);
      const buffer = new Uint8Array(2);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        ids,
        "col1",
        99,
        () => 10,
        (value) => value,
      );

      expect(buffer[0]).toBe(10);
      expect(buffer[1]).toBe(99); // ID 2 missing
      expect(warn).toHaveBeenCalledOnce();
      warn.mockRestore();
    });

    it("warns once, rather than per item, about missing IDs", async () => {
      const ids = [1, 2, 3, 4];
      const { data } = createMockTableData([1], ["A"]);
      const buffer = new Uint8Array(4);
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        ids,
        "col1",
        99,
        () => 10,
        (value) => value,
      );

      expect(warn).toHaveBeenCalledOnce();
      expect(warn.mock.calls[0]![0]).toContain("3 IDs");
      warn.mockRestore();
    });

    it("matches table rows by ID rather than by position", async () => {
      const { data } = createMockTableData([3, 1, 2], ["C", "A", "B"]);
      const buffer = new Uint8Array(3);

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        [1, 2, 3],
        "col1",
        0,
        (group) => group.length, // JSON.stringify adds the quotes
        (value) => value,
      );

      expect(Array.from(buffer)).toEqual([3, 3, 3]);
    });

    it("JSON-stringifies group values before mapping", async () => {
      const { data } = createMockTableData([1], [42]);
      const buffer = new Uint8Array(1);
      const mapGroupToValue = vi
        .fn<(group: string) => number | undefined>()
        .mockReturnValue(1);

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        [1],
        "col1",
        0,
        mapGroupToValue,
        (value) => value,
      );

      // numeric 42 becomes "42" after JSON.stringify
      expect(mapGroupToValue).toHaveBeenCalledWith("42");
    });

    it("maps each distinct raw group only once", async () => {
      const ids = [1, 2, 3];
      const { data } = createMockTableData([1, 2, 3], ["A", "A", "B"]);
      const buffer = new Uint8Array(3);
      const mapGroupToValue = vi
        .fn<(group: string) => number | undefined>()
        .mockImplementation((group) =>
          group === JSON.stringify("A") ? 10 : 20,
        );

      await ResolverBase.fillFromTableGroups(
        buffer,
        data,
        ids,
        "col1",
        0,
        mapGroupToValue,
        (value) => value,
      );

      expect(Array.from(buffer)).toEqual([10, 10, 20]);
      // Groups "A" and "B" mapped once each, despite three IDs
      expect(mapGroupToValue).toHaveBeenCalledTimes(2);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const { data, loadValues } = createMockTableData([1], ["A"]);
      const buffer = new Uint8Array(1);

      await expect(
        ResolverBase.fillFromTableGroups(
          buffer,
          data,
          [1],
          "col1",
          0,
          vi.fn(),
          vi.fn(),
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
      expect(loadValues).not.toHaveBeenCalled();
    });
  });
});
