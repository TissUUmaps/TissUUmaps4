import { describe, expect, it, vi } from "vitest";

import {
  type DefaultMap,
  HashUtils,
  Marker,
  type MarkerConfig,
  type TableData,
  markerPalette,
} from "@tissuumaps/core";

import { MarkerResolver } from "./MarkerResolver";

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

describe("MarkerResolver", () => {
  describe("parseMarker", () => {
    it("returns numeric marker indices unchanged", () => {
      expect(MarkerResolver.parseMarker(Marker.Disc)).toBe(Marker.Disc);
      expect(MarkerResolver.parseMarker(0)).toBe(0);
    });

    it("returns undefined for non-number values", () => {
      expect(MarkerResolver.parseMarker("disc")).toBeUndefined();
      expect(MarkerResolver.parseMarker(null)).toBeUndefined();
    });
  });

  describe("encodeMarker", () => {
    it("returns the marker index as-is", () => {
      expect(MarkerResolver.encodeMarker(Marker.Star)).toBe(Marker.Star);
      expect(MarkerResolver.encodeMarker(Marker.Cross)).toBe(0);
    });
  });

  describe("createMarkerBuffer", () => {
    it("creates a zeroed Uint8Array of the requested size", () => {
      const data = MarkerResolver.createMarkerBuffer(3);
      expect(data).toBeInstanceOf(Uint8Array);
      expect(Array.from(data)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(MarkerResolver.createMarkerBuffer(3, { align: 4 }).length).toBe(4);
    });
  });

  describe("createUniformMarkers", () => {
    it("fills the buffer with the encoded marker", () => {
      const data = MarkerResolver.createUniformMarkers(3, Marker.Square);
      expect(Array.from(data)).toEqual([
        Marker.Square,
        Marker.Square,
        Marker.Square,
      ]);
    });
  });

  describe("resolveUniformMarkers", () => {
    it("fills the buffer with the constant marker", () => {
      const config = {
        constant: { value: Marker.Diamond },
      } satisfies MarkerConfig;
      const data = MarkerResolver.resolveUniformMarkers([1, 2], config);
      expect(Array.from(data)).toEqual([Marker.Diamond, Marker.Diamond]);
    });
  });

  describe("resolveMarkersFromTableValues", () => {
    it("reads markers from the table column", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, [Marker.Disc, Marker.Star]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkersFromTableValues(
        ids,
        config,
        Marker.Cross,
        loadTable,
      );

      expect(Array.from(data)).toEqual([Marker.Disc, Marker.Star]);
    });

    it("uses the default marker for invalid values", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["bad", Marker.Star]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkersFromTableValues(
        ids,
        config,
        Marker.Ring,
        loadTable,
      );

      expect(data[0]).toBe(Marker.Ring);
      expect(data[1]).toBe(Marker.Star);
    });
  });

  describe("resolveMarkersFromTableGroups", () => {
    it("maps groups to markers using the marker map", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["A", "B"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "Marker Map",
        values: {
          [JSON.stringify("A")]: Marker.Disc,
          [JSON.stringify("B")]: Marker.Square,
        },
      };
      const config = {
        groupBy: { column: "col1", map: "mm1" },
      } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkersFromTableGroups(
        ids,
        config,
        [markerMap],
        Marker.Cross,
        loadTable,
      );

      expect(Array.from(data)).toEqual([Marker.Disc, Marker.Square]);
    });

    it("uses the marker map default for unmapped groups", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["missing"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "Marker Map",
        values: {},
        default: Marker.Ring,
      };
      const config = {
        groupBy: { column: "col1", map: "mm1" },
      } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkersFromTableGroups(
        ids,
        config,
        [markerMap],
        Marker.Cross,
        loadTable,
      );

      expect(data[0]).toBe(Marker.Ring);
    });

    it("returns uniform default marker when a map is specified but not found", async () => {
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkersFromTableGroups(
        [1, 2],
        config,
        [],
        Marker.Star,
        vi.fn(),
      );

      expect(Array.from(data)).toEqual([Marker.Star, Marker.Star]);
    });

    it("hashes group names through the marker palette when no map is given", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["groupA", "groupB"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        groupBy: { column: "col1", map: undefined },
      } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkersFromTableGroups(
        ids,
        config,
        [],
        Marker.Cross,
        loadTable,
      );

      expect(data[0]).toBe(
        HashUtils.djb2Pick(markerPalette, JSON.stringify("groupA")),
      );
      expect(data[1]).toBe(
        HashUtils.djb2Pick(markerPalette, JSON.stringify("groupB")),
      );
    });
  });

  describe("resolveMarkers", () => {
    it("dispatches to constant", async () => {
      const config = {
        constant: { value: Marker.Disc },
      } satisfies MarkerConfig;
      const data = await MarkerResolver.resolveMarkers(
        [1, 2],
        config,
        [],
        Marker.Cross,
        vi.fn(),
      );
      expect(Array.from(data)).toEqual([Marker.Disc, Marker.Disc]);
    });

    it("dispatches to from config when a table is given", async () => {
      const tableData = createMockTableData([1], [Marker.Star]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkers(
        [1],
        config,
        [],
        Marker.Cross,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(Marker.Star);
    });

    it("dispatches to groupBy config when a table is given", async () => {
      const tableData = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "Marker Map",
        values: { [JSON.stringify("A")]: Marker.Diamond },
      };
      const config = {
        groupBy: { column: "col1", map: "mm1" },
      } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkers(
        [1],
        config,
        [markerMap],
        Marker.Cross,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(Marker.Diamond);
    });

    it("falls back to the default marker when the config has no active source", async () => {
      const config = {} as MarkerConfig;
      const data = await MarkerResolver.resolveMarkers(
        [1, 2],
        config,
        [],
        Marker.Ring,
        vi.fn(),
      );
      expect(Array.from(data)).toEqual([Marker.Ring, Marker.Ring]);
    });

    it("does not load the table for a from config without a table id", async () => {
      const loadTable = vi.fn();
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      const data = await MarkerResolver.resolveMarkers(
        [1],
        config,
        [],
        Marker.Ring,
        loadTable,
      );

      expect(loadTable).not.toHaveBeenCalled();
      expect(data[0]).toBe(Marker.Ring);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = {
        constant: { value: Marker.Disc },
      } satisfies MarkerConfig;

      await expect(
        MarkerResolver.resolveMarkers([1], config, [], Marker.Cross, vi.fn(), {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
