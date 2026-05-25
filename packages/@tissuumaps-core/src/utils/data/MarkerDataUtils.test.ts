import { describe, expect, it, vi } from "vitest";

import { type DefaultMap, Marker } from "../../model/types";
import { markerPalette } from "../../palettes";
import { type TableData } from "../../storage/table";
import { HashUtils } from "../HashUtils";
import { MarkerDataUtils } from "./MarkerDataUtils";

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

describe("MarkerDataUtils", () => {
  describe("encodeMarker", () => {
    it("returns the marker numeric value", () => {
      expect(MarkerDataUtils.encodeMarker(Marker.Cross)).toBe(0);
      expect(MarkerDataUtils.encodeMarker(Marker.Diamond)).toBe(1);
      expect(MarkerDataUtils.encodeMarker(Marker.Gaussian)).toBe(14);
    });
  });

  describe("parseMarkerValue", () => {
    it("returns the value as Marker when it is a number", () => {
      expect(MarkerDataUtils.parseMarkerValue(3)).toBe(3);
    });

    it("returns undefined for non-number values", () => {
      expect(MarkerDataUtils.parseMarkerValue("abc")).toBeUndefined();
      expect(MarkerDataUtils.parseMarkerValue(null)).toBeUndefined();
      expect(MarkerDataUtils.parseMarkerValue(undefined)).toBeUndefined();
    });
  });

  describe("createUniformMarkerData", () => {
    it("creates a buffer filled with the encoded marker", () => {
      const data = MarkerDataUtils.createUniformMarkerData(3, Marker.Star);
      expect(data).toBeInstanceOf(Uint8Array);
      expect(data.length).toBe(3);
      for (let i = 0; i < 3; i++) {
        expect(data[i]).toBe(Marker.Star);
      }
    });

    it("respects alignment", () => {
      const data = MarkerDataUtils.createUniformMarkerData(3, Marker.Disc, {
        align: 8,
      });
      expect(data.length).toBe(8);
    });
  });

  describe("loadConstantMarkerData", () => {
    it("fills buffer with the constant marker", () => {
      const config = {
        source: "constant" as const,
        constant: { value: Marker.Square },
      };
      const data = MarkerDataUtils.loadUniformMarkerData([1, 2], config);
      expect(data[0]).toBe(Marker.Square);
      expect(data[1]).toBe(Marker.Square);
    });
  });

  describe("loadFromMarkerData", () => {
    it("reads marker values from a table column", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, [Marker.Star, Marker.Ring]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await MarkerDataUtils.loadMarkerDataFromTableValues(
        ids,
        config,
        Marker.Cross,
        loadTable,
      );

      expect(data[0]).toBe(Marker.Star);
      expect(data[1]).toBe(Marker.Ring);
    });

    it("uses default marker for non-number values", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["bad"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await MarkerDataUtils.loadMarkerDataFromTableValues(
        ids,
        config,
        Marker.Diamond,
        loadTable,
      );

      expect(data[0]).toBe(Marker.Diamond);
    });
  });

  describe("loadGroupByMarkerData", () => {
    it("uses marker map when map is specified and found", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["a", "b"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "Marker Map 1",
        values: {
          [JSON.stringify("a")]: Marker.Star,
          [JSON.stringify("b")]: Marker.Ring,
        },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "mm1" },
      };

      const data = await MarkerDataUtils.loadMarkerDataFromTableGroups(
        ids,
        config,
        [markerMap],
        Marker.Cross,
        loadTable,
      );

      expect(data[0]).toBe(Marker.Star);
      expect(data[1]).toBe(Marker.Ring);
    });

    it("uses marker map default when group is unmapped", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["unknown"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "Marker Map 1",
        values: {},
        default: Marker.Gaussian,
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "mm1" },
      };

      const data = await MarkerDataUtils.loadMarkerDataFromTableGroups(
        ids,
        config,
        [markerMap],
        Marker.Cross,
        loadTable,
      );

      expect(data[0]).toBe(Marker.Gaussian);
    });

    it("returns uniform default marker when map is not found", async () => {
      const ids = [1];
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "nonexistent" },
      };

      const data = await MarkerDataUtils.loadMarkerDataFromTableGroups(
        ids,
        config,
        [],
        Marker.Diamond,
        vi.fn(),
      );

      expect(data[0]).toBe(Marker.Diamond);
    });

    it("uses hash-based marker palette when no map is specified", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["groupA", "groupB"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: undefined },
      };

      const data = await MarkerDataUtils.loadMarkerDataFromTableGroups(
        ids,
        config,
        [],
        Marker.Cross,
        loadTable,
      );

      // Verify colors come from hash-based palette
      const expectedMarker0 =
        markerPalette[
          HashUtils.djb2(JSON.stringify("groupA")) % markerPalette.length
        ]!;
      const expectedMarker1 =
        markerPalette[
          HashUtils.djb2(JSON.stringify("groupB")) % markerPalette.length
        ]!;
      expect(data[0]).toBe(expectedMarker0);
      expect(data[1]).toBe(expectedMarker1);
    });
  });

  describe("loadMarkerData", () => {
    it("dispatches to constant config", async () => {
      const config = {
        source: "constant" as const,
        constant: { value: Marker.Star },
      };

      const data = await MarkerDataUtils.loadMarkerData(
        [1, 2],
        config,
        [],
        Marker.Cross,
        vi.fn(),
      );

      expect(data[0]).toBe(Marker.Star);
      expect(data[1]).toBe(Marker.Star);
    });

    it("dispatches to from config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, [Marker.Diamond]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { table: "t1", column: "col1" },
      };

      const data = await MarkerDataUtils.loadMarkerData(
        ids,
        config,
        [],
        Marker.Cross,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(Marker.Diamond);
    });

    it("dispatches to groupBy config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["a"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "MM",
        values: { [JSON.stringify("a")]: Marker.Arrow },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { table: "t1", column: "col1", map: "mm1" },
      };

      const data = await MarkerDataUtils.loadMarkerData(
        ids,
        config,
        [markerMap],
        Marker.Cross,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(Marker.Arrow);
    });

    it("falls back to default marker for invalid config", async () => {
      const data = await MarkerDataUtils.loadMarkerData(
        [1],
        {} as never,
        [],
        Marker.Disc,
        vi.fn(),
      );

      expect(data[0]).toBe(Marker.Disc);
    });

    it("throws when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        MarkerDataUtils.loadMarkerData(
          [1],
          { source: "constant" as const, constant: { value: Marker.Cross } },
          [],
          Marker.Cross,
          vi.fn(),
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
    });
  });
});
