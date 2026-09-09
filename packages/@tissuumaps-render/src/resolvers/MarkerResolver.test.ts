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

    it("parses integer strings", () => {
      expect(MarkerResolver.parseMarker("2")).toBe(Marker.Square);
    });

    it("returns undefined for values that are not safe integers", () => {
      expect(MarkerResolver.parseMarker("disc")).toBeUndefined();
      expect(MarkerResolver.parseMarker(1.5)).toBeUndefined();
      expect(MarkerResolver.parseMarker(NaN)).toBeUndefined();
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
      const buffer = MarkerResolver.createMarkerBuffer(3);
      expect(buffer).toBeInstanceOf(Uint8Array);
      expect(Array.from(buffer)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(MarkerResolver.createMarkerBuffer(3, { align: 4 }).length).toBe(4);
    });
  });

  describe("createUniformMarkers", () => {
    it("fills the buffer with the encoded marker", () => {
      const buffer = MarkerResolver.createUniformMarkers(3, Marker.Square);
      expect(Array.from(buffer)).toEqual([
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
      const buffer = MarkerResolver.resolveUniformMarkers([1, 2], config);
      expect(Array.from(buffer)).toEqual([Marker.Diamond, Marker.Diamond]);
    });
  });

  describe("resolveMarkersFromTableValues", () => {
    it("reads markers from the table column", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, [Marker.Disc, Marker.Star]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkersFromTableValues(
        ids,
        config,
        Marker.Cross,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([Marker.Disc, Marker.Star]);
    });

    it("uses the default marker for invalid values", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["bad", Marker.Star]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkersFromTableValues(
        ids,
        config,
        Marker.Ring,
        loadTable,
      );

      expect(buffer[0]).toBe(Marker.Ring);
      expect(buffer[1]).toBe(Marker.Star);
    });

    it("forwards the signal to loadTable", async () => {
      const controller = new AbortController();
      const data = createMockTableData([1], [Marker.Star]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      await MarkerResolver.resolveMarkersFromTableValues(
        [1],
        config,
        Marker.Cross,
        loadTable,
        { signal: controller.signal },
      );

      expect(loadTable).toHaveBeenCalledWith({ signal: controller.signal });
    });
  });

  describe("resolveMarkersFromTableGroups", () => {
    it("maps groups to markers using the marker map", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["A", "B"]);
      const loadTable = vi.fn().mockResolvedValue(data);
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

      const buffer = await MarkerResolver.resolveMarkersFromTableGroups(
        ids,
        config,
        [markerMap],
        Marker.Cross,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([Marker.Disc, Marker.Square]);
    });

    it("uses the marker map default for unmapped groups", async () => {
      const ids = [1];
      const data = createMockTableData(ids, ["missing"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "Marker Map",
        values: {},
        default: Marker.Ring,
      };
      const config = {
        groupBy: { column: "col1", map: "mm1" },
      } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkersFromTableGroups(
        ids,
        config,
        [markerMap],
        Marker.Cross,
        loadTable,
      );

      expect(buffer[0]).toBe(Marker.Ring);
    });

    it("returns uniform default marker when a map is specified but not found", async () => {
      const loadTable = vi.fn();
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkersFromTableGroups(
        [1, 2],
        config,
        [],
        Marker.Star,
        loadTable,
      );

      expect(Array.from(buffer)).toEqual([Marker.Star, Marker.Star]);
      expect(loadTable).not.toHaveBeenCalled();
    });

    it("hashes group names through the marker palette when no map is given", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["groupA", "groupB"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = {
        groupBy: { column: "col1", map: undefined },
      } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkersFromTableGroups(
        ids,
        config,
        [],
        Marker.Cross,
        loadTable,
      );

      expect(buffer[0]).toBe(
        HashUtils.djb2Pick(markerPalette, JSON.stringify("groupA")),
      );
      expect(buffer[1]).toBe(
        HashUtils.djb2Pick(markerPalette, JSON.stringify("groupB")),
      );
    });
  });

  describe("resolveMarkers", () => {
    it("dispatches to constant", async () => {
      const config = {
        constant: { value: Marker.Disc },
      } satisfies MarkerConfig;
      const buffer = await MarkerResolver.resolveMarkers(
        [1, 2],
        config,
        [],
        Marker.Cross,
      );
      expect(Array.from(buffer)).toEqual([Marker.Disc, Marker.Disc]);
    });

    it("dispatches to from config when loadTable is given", async () => {
      const data = createMockTableData([1], [Marker.Star]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkers(
        [1],
        config,
        [],
        Marker.Cross,
        { loadTable },
      );

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(Marker.Star);
    });

    it("dispatches to groupBy config when loadTable is given", async () => {
      const data = createMockTableData([1], ["A"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "Marker Map",
        values: { [JSON.stringify("A")]: Marker.Diamond },
      };
      const config = {
        groupBy: { column: "col1", map: "mm1" },
      } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkers(
        [1],
        config,
        [markerMap],
        Marker.Cross,
        { loadTable },
      );

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(Marker.Diamond);
    });

    it("falls back to the default marker when the config has no active source", async () => {
      const config = {} as MarkerConfig;
      const buffer = await MarkerResolver.resolveMarkers(
        [1, 2],
        config,
        [],
        Marker.Ring,
      );
      expect(Array.from(buffer)).toEqual([Marker.Ring, Marker.Ring]);
    });

    it("falls back to the default marker for a from config without loadTable", async () => {
      const config = { from: { column: "col1" } } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkers(
        [1],
        config,
        [],
        Marker.Ring,
      );

      expect(buffer[0]).toBe(Marker.Ring);
    });

    it("falls back to the default marker for a groupBy config without loadTable", async () => {
      const markerMap: DefaultMap<Marker> = {
        id: "mm1",
        name: "Marker Map",
        values: { [JSON.stringify("A")]: Marker.Diamond },
      };
      const config = {
        groupBy: { column: "col1", map: "mm1" },
      } satisfies MarkerConfig;

      const buffer = await MarkerResolver.resolveMarkers(
        [1],
        config,
        [markerMap],
        Marker.Ring,
        {},
      );

      expect(buffer[0]).toBe(Marker.Ring);
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = {
        constant: { value: Marker.Disc },
      } satisfies MarkerConfig;

      await expect(
        MarkerResolver.resolveMarkers([1], config, [], Marker.Cross, {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
