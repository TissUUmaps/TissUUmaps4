import { describe, expect, it, vi } from "vitest";

import { type DefaultMap } from "../../model/types";
import { type TableData } from "../../storage/table";
import { VisibilityDataUtils } from "./VisibilityDataUtils";

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

describe("VisibilityDataUtils", () => {
  describe("encodeVisibility", () => {
    it("returns 1 for true and 0 for false", () => {
      expect(VisibilityDataUtils.encodeVisibility(true)).toBe(1);
      expect(VisibilityDataUtils.encodeVisibility(false)).toBe(0);
    });
  });

  describe("parseVisibilityValue", () => {
    it("returns true for positive numbers", () => {
      expect(VisibilityDataUtils.parseVisibilityValue(1)).toBe(true);
      expect(VisibilityDataUtils.parseVisibilityValue(0.5)).toBe(true);
    });

    it("returns false for zero and negative numbers", () => {
      expect(VisibilityDataUtils.parseVisibilityValue(0)).toBe(false);
      expect(VisibilityDataUtils.parseVisibilityValue(-1)).toBe(false);
    });

    it("returns undefined for non-number values", () => {
      expect(VisibilityDataUtils.parseVisibilityValue("abc")).toBeUndefined();
      expect(VisibilityDataUtils.parseVisibilityValue(null)).toBeUndefined();
    });
  });

  describe("createUniformVisibilityData", () => {
    it("creates a buffer filled with 1 for true", () => {
      const data = VisibilityDataUtils.createUniformVisibilityData(3, true);
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(3);
      for (let i = 0; i < 3; i++) {
        expect(data[i]).toBe(1);
      }
    });

    it("creates a buffer filled with 0 for false", () => {
      const data = VisibilityDataUtils.createUniformVisibilityData(3, false);
      for (let i = 0; i < 3; i++) {
        expect(data[i]).toBe(0);
      }
    });

    it("respects alignment", () => {
      const data = VisibilityDataUtils.createUniformVisibilityData(3, true, {
        align: 4,
      });
      expect(data.length).toBe(4);
    });
  });

  describe("loadConstantVisibilityData", () => {
    it("fills buffer with constant visibility", () => {
      const config = {
        source: "constant" as const,
        constant: { value: true },
      };
      const data = VisibilityDataUtils.loadConstantVisibilityData(
        [1, 2],
        config,
      );
      expect(data[0]).toBe(1);
      expect(data[1]).toBe(1);
    });

    it("fills buffer with false visibility", () => {
      const config = {
        source: "constant" as const,
        constant: { value: false },
      };
      const data = VisibilityDataUtils.loadConstantVisibilityData([1], config);
      expect(data[0]).toBe(0);
    });
  });

  describe("loadFromVisibilityData", () => {
    it("reads visibility values from a table column", async () => {
      const ids = [1, 2, 3];
      const tableData = createMockTableData(ids, [1, 0, 5]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await VisibilityDataUtils.loadFromVisibilityData(
        ids,
        config,
        true,
        loadTable,
      );

      expect(data[0]).toBe(1); // 1 > 0 → true
      expect(data[1]).toBe(0); // 0 is not > 0 → false
      expect(data[2]).toBe(1); // 5 > 0 → true
    });

    it("uses default visibility for invalid values", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["bad"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await VisibilityDataUtils.loadFromVisibilityData(
        ids,
        config,
        false,
        loadTable,
      );

      expect(data[0]).toBe(0); // default false
    });
  });

  describe("loadGroupByVisibilityData", () => {
    it("uses visibility map when found", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["show", "hide"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const visibilityMap: DefaultMap<boolean> = {
        id: "vm1",
        name: "Visibility Map",
        values: {
          [JSON.stringify("show")]: true,
          [JSON.stringify("hide")]: false,
        },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "vm1" },
      };

      const data = await VisibilityDataUtils.loadGroupByVisibilityData(
        ids,
        config,
        [visibilityMap],
        true,
        loadTable,
      );

      expect(data[0]).toBe(1);
      expect(data[1]).toBe(0);
    });

    it("uses map default when group is unmapped", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["unknown"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const visibilityMap: DefaultMap<boolean> = {
        id: "vm1",
        name: "VM",
        values: {},
        default: false,
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "vm1" },
      };

      const data = await VisibilityDataUtils.loadGroupByVisibilityData(
        ids,
        config,
        [visibilityMap],
        true,
        loadTable,
      );

      expect(data[0]).toBe(0);
    });

    it("returns uniform default when map is not found", async () => {
      const ids = [1];
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "nonexistent" },
      };

      const data = await VisibilityDataUtils.loadGroupByVisibilityData(
        ids,
        config,
        [],
        true,
        vi.fn(),
      );

      expect(data[0]).toBe(1);
    });
  });

  describe("loadVisibilityData", () => {
    it("dispatches to constant config", async () => {
      const config = {
        source: "constant" as const,
        constant: { value: false },
      };

      const data = await VisibilityDataUtils.loadVisibilityData(
        [1],
        config,
        [],
        true,
        vi.fn(),
      );

      expect(data[0]).toBe(0);
    });

    it("dispatches to from config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, [1]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await VisibilityDataUtils.loadVisibilityData(
        ids,
        config,
        [],
        false,
        loadTable,
      );

      expect(data[0]).toBe(1);
    });

    it("dispatches to groupBy config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["show"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const visibilityMap: DefaultMap<boolean> = {
        id: "vm1",
        name: "VM",
        values: { [JSON.stringify("show")]: true },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "vm1" },
      };

      const data = await VisibilityDataUtils.loadVisibilityData(
        ids,
        config,
        [visibilityMap],
        false,
        loadTable,
      );

      expect(data[0]).toBe(1);
    });

    it("falls back to default visibility for invalid config", async () => {
      const data = await VisibilityDataUtils.loadVisibilityData(
        [1],
        {} as never,
        [],
        true,
        vi.fn(),
      );

      expect(data[0]).toBe(1);
    });

    it("throws when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        VisibilityDataUtils.loadVisibilityData(
          [1],
          { source: "constant" as const, constant: { value: true } },
          [],
          true,
          vi.fn(),
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
    });
  });
});
