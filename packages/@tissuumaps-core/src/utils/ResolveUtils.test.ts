import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type ColorConfig,
  type MarkerConfig,
  type OpacityConfig,
  type SizeConfig,
  type VisibilityConfig,
} from "../model/configs";
import { type Color, type DefaultMap, Marker } from "../model/types";
import { colorPalettes, markerPalette } from "../palettes";
import { type TableData } from "../storage/table";
import { ColorUtils } from "./ColorUtils";
import { HashUtils } from "./HashUtils";
import { MathUtils } from "./MathUtils";
import { ResolveUtils } from "./ResolveUtils";

type ColumnMap = Record<string, unknown[]>;

const createTableData = (index: number[], columns: ColumnMap): TableData => {
  const ranges = new Map<string, [number, number]>();
  return {
    getLength: () => index.length,
    getIndex: () => index,
    destroy: () => undefined,
    suggestColumnQueries: () => Promise.resolve([]),
    getColumn: (query: string) =>
      Promise.resolve(query in columns ? query : null),
    loadColumn: <T>(
      column: string,
      { computeRange }: { signal?: AbortSignal; computeRange?: boolean } = {},
    ) => {
      const values = (columns[column] ?? []) as T[];
      if (computeRange && !ranges.has(column)) {
        let vmin: number | undefined, vmax: number | undefined;
        for (const v of values) {
          if (typeof v === "number" && Number.isFinite(v)) {
            if (vmin === undefined || v < vmin) vmin = v;
            if (vmax === undefined || v > vmax) vmax = v;
          }
        }
        if (vmin !== undefined && vmax !== undefined && vmin < vmax) {
          ranges.set(column, [vmin, vmax]);
        }
      }
      return Promise.resolve(values);
    },
    getRange: (column: string) => ranges.get(column),
  };
};

const createLoadTable =
  (tables: Record<string, TableData>) => (tableId: string) => {
    const table = tables[tableId];
    if (!table) {
      return Promise.reject(new Error(`Table ${tableId} not found`));
    }
    return Promise.resolve(table);
  };

describe("ResolveUtils", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("resolveMarkers", () => {
    it("resolves constant markers with alignment", async () => {
      const config: MarkerConfig = { constant: { value: Marker.Disc } };
      const loadTable = createLoadTable({});

      const result = await ResolveUtils.resolveMarkers(
        [1, 2],
        config,
        [],
        Marker.Cross,
        loadTable,
        { align: 4 },
      );

      expect(Array.from(result)).toEqual([Marker.Disc, Marker.Disc, 0, 0]);
      expect(result.length).toBe(4);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("resolves markers from table values with defaults and warnings", async () => {
      const config: MarkerConfig = {
        from: { table: "markers", column: "marker" },
      };
      const table = createTableData([1, 2], {
        marker: [Marker.Cross, "bad"],
      });
      const loadTable = createLoadTable({ markers: table });

      const result = await ResolveUtils.resolveMarkers(
        [1, 2, 3],
        config,
        [],
        Marker.Disc,
        loadTable,
      );

      expect(Array.from(result)).toEqual([
        Marker.Cross,
        Marker.Disc,
        Marker.Disc,
      ]);
      expect(warnSpy).toHaveBeenCalledWith("Invalid marker table value: bad");
      expect(warnSpy).toHaveBeenCalledWith("ID 3 missing in table markers");
    });

    it("resolves markers from groupBy map", async () => {
      const config: MarkerConfig = {
        groupBy: { table: "groups", column: "group", map: "marker-map" },
      };
      const groupKey = JSON.stringify("A");
      const markerMaps: DefaultMap<Marker>[] = [
        {
          id: "marker-map",
          name: "Marker Map",
          values: { [groupKey]: Marker.Star },
          default: Marker.Cross,
        },
      ];
      const table = createTableData([1, 2], { group: ["A", "B"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveMarkers(
        [1, 2],
        config,
        markerMaps,
        Marker.Disc,
        loadTable,
      );

      expect(Array.from(result)).toEqual([Marker.Star, Marker.Cross]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("falls back to default marker when groupBy map is missing", async () => {
      const config: MarkerConfig = {
        groupBy: { table: "groups", column: "group", map: "missing" },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveMarkers(
        [1],
        config,
        [],
        Marker.Disc,
        loadTable,
      );

      expect(Array.from(result)).toEqual([Marker.Disc]);
      expect(warnSpy).toHaveBeenCalledWith("Marker map missing not found");
    });

    it("resolves markers from groupBy palette hash when no map is set", async () => {
      const config: MarkerConfig = {
        groupBy: { table: "groups", column: "group", map: undefined },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });
      const groupKey = JSON.stringify("A");
      const expected =
        markerPalette[HashUtils.djb2(groupKey) % markerPalette.length]!;

      const result = await ResolveUtils.resolveMarkers(
        [1],
        config,
        [],
        Marker.Disc,
        loadTable,
      );

      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("falls back to default markers when no config source is active", async () => {
      const config = {} as MarkerConfig;
      const loadTable = createLoadTable({});

      const result = await ResolveUtils.resolveMarkers(
        [1, 2],
        config,
        [],
        Marker.TriangleDown,
        loadTable,
      );

      expect(Array.from(result)).toEqual([
        Marker.TriangleDown,
        Marker.TriangleDown,
      ]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("resolveSizes", () => {
    it("resolves constant sizes", async () => {
      const config: SizeConfig = { constant: { value: 3 } };
      const loadTable = createLoadTable({});

      const result = await ResolveUtils.resolveSizes(
        [1],
        config,
        [],
        1,
        loadTable,
      );

      expect(Array.from(result)).toEqual([3]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("resolves sizes from table values with factor and warnings", async () => {
      const config: SizeConfig = {
        from: { table: "sizes", column: "size" },
      };
      const table = createTableData([1, 2], { size: [2, "bad"] });
      const loadTable = createLoadTable({ sizes: table });

      const result = await ResolveUtils.resolveSizes(
        [1, 2],
        config,
        [],
        1,
        loadTable,
        { sizeFactor: 2 },
      );

      expect(Array.from(result)).toEqual([4, 2]);
      expect(warnSpy).toHaveBeenCalledWith("Invalid size table value: bad");
    });

    it("resolves sizes from groupBy map with missing ids", async () => {
      const config: SizeConfig = {
        groupBy: { table: "groups", column: "group", map: "size-map" },
      };
      const groupKey = JSON.stringify("A");
      const sizeMaps: DefaultMap<number>[] = [
        {
          id: "size-map",
          name: "Size Map",
          values: { [groupKey]: 2 },
          default: 1,
        },
      ];
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveSizes(
        [1, 2],
        config,
        sizeMaps,
        5,
        loadTable,
      );

      expect(Array.from(result)).toEqual([2, 5]);
      expect(warnSpy).toHaveBeenCalledWith("ID 2 missing in table groups");
    });

    it("uses size map default for unmapped groups", async () => {
      const config: SizeConfig = {
        groupBy: { table: "groups", column: "group", map: "size-map" },
      };
      const groupKey = JSON.stringify("A");
      const sizeMaps: DefaultMap<number>[] = [
        {
          id: "size-map",
          name: "Size Map",
          values: { [groupKey]: 2 },
          default: 4,
        },
      ];
      const table = createTableData([1, 2], { group: ["A", "B"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveSizes(
        [1, 2],
        config,
        sizeMaps,
        9,
        loadTable,
      );

      expect(Array.from(result)).toEqual([2, 4]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("warns and falls back when size map is missing", async () => {
      const config: SizeConfig = {
        groupBy: { table: "groups", column: "group", map: "missing" },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveSizes(
        [1],
        config,
        [],
        3,
        loadTable,
      );

      expect(Array.from(result)).toEqual([3]);
      expect(warnSpy).toHaveBeenCalledWith("Size map missing not found");
    });

    it("falls back to default sizes when no config source is active", async () => {
      const config = {} as SizeConfig;
      const loadTable = createLoadTable({});

      const result = await ResolveUtils.resolveSizes(
        [1, 2],
        config,
        [],
        7,
        loadTable,
      );

      expect(Array.from(result)).toEqual([7, 7]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("resolveVisibilities", () => {
    it("resolves constant visibility", async () => {
      const config: VisibilityConfig = { constant: { value: false } };
      const loadTable = createLoadTable({});

      const result = await ResolveUtils.resolveVisibilities(
        [1],
        config,
        [],
        true,
        loadTable,
      );

      expect(Array.from(result)).toEqual([0]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("resolves visibilities from table values", async () => {
      const config: VisibilityConfig = {
        from: { table: "vis", column: "v" },
      };
      const table = createTableData([1, 2], { v: [0, 2] });
      const loadTable = createLoadTable({ vis: table });

      const result = await ResolveUtils.resolveVisibilities(
        [1, 2, 3],
        config,
        [],
        true,
        loadTable,
      );

      expect(Array.from(result)).toEqual([0, 1, 1]);
      expect(warnSpy).toHaveBeenCalledWith("ID 3 missing in table vis");
    });

    it("warns on invalid visibility values", async () => {
      const config: VisibilityConfig = {
        from: { table: "vis", column: "v" },
      };
      const table = createTableData([1], { v: ["bad"] });
      const loadTable = createLoadTable({ vis: table });

      const result = await ResolveUtils.resolveVisibilities(
        [1],
        config,
        [],
        false,
        loadTable,
      );

      expect(Array.from(result)).toEqual([0]);
      expect(warnSpy).toHaveBeenCalledWith(
        "Invalid visibility table value: bad",
      );
    });

    it("resolves visibilities from groupBy map", async () => {
      const config: VisibilityConfig = {
        groupBy: { table: "groups", column: "group", map: "vis-map" },
      };
      const groupKey = JSON.stringify("A");
      const visibilityMaps: DefaultMap<boolean>[] = [
        {
          id: "vis-map",
          name: "Visibility Map",
          values: { [groupKey]: true },
          default: false,
        },
      ];
      const table = createTableData([1, 2], { group: ["A", "B"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveVisibilities(
        [1, 2],
        config,
        visibilityMaps,
        false,
        loadTable,
      );

      expect(Array.from(result)).toEqual([1, 0]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("warns and falls back when visibility map is missing", async () => {
      const config: VisibilityConfig = {
        groupBy: { table: "groups", column: "group", map: "missing" },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveVisibilities(
        [1],
        config,
        [],
        true,
        loadTable,
      );

      expect(Array.from(result)).toEqual([1]);
      expect(warnSpy).toHaveBeenCalledWith("Visibility map missing not found");
    });

    it("uses default visibility when map returns undefined", async () => {
      const config: VisibilityConfig = {
        groupBy: { table: "groups", column: "group", map: "vis-map" },
      };
      const visibilityMaps: DefaultMap<boolean>[] = [
        {
          id: "vis-map",
          name: "Visibility Map",
          values: {},
        },
      ];
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveVisibilities(
        [1],
        config,
        visibilityMaps,
        true,
        loadTable,
      );

      expect(Array.from(result)).toEqual([1]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("falls back to default visibility when no config source is active", async () => {
      const config = {} as VisibilityConfig;
      const loadTable = createLoadTable({});

      const result = await ResolveUtils.resolveVisibilities(
        [1, 2],
        config,
        [],
        false,
        loadTable,
      );

      expect(Array.from(result)).toEqual([0, 0]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("resolveOpacities", () => {
    it("resolves constant opacities", async () => {
      const config: OpacityConfig = { constant: { value: 0.5 } };
      const loadTable = createLoadTable({});

      const result = await ResolveUtils.resolveOpacities(
        [1, 2],
        config,
        [],
        0,
        loadTable,
      );

      expect(Array.from(result)).toEqual([128, 128]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("resolves opacities from groupBy map with factor", async () => {
      const config: OpacityConfig = {
        groupBy: { table: "groups", column: "group", map: "opacity-map" },
      };
      const groupKey = JSON.stringify("A");
      const opacityMaps: DefaultMap<number>[] = [
        {
          id: "opacity-map",
          name: "Opacity Map",
          values: { [groupKey]: 0.5 },
          default: 0.25,
        },
      ];
      const table = createTableData([1, 2], { group: ["A", "B"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveOpacities(
        [1, 2],
        config,
        opacityMaps,
        0.1,
        loadTable,
        { opacityFactor: 2 },
      );

      const encode = (value: number) =>
        MathUtils.clamp(Math.round(value * 2 * 255), 0, 255);
      expect(Array.from(result)).toEqual([encode(0.5), encode(0.25)]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("warns on invalid opacity values", async () => {
      const config: OpacityConfig = {
        from: { table: "opacity", column: "o" },
      };
      const table = createTableData([1, 2], { o: [2, "bad"] });
      const loadTable = createLoadTable({ opacity: table });

      const result = await ResolveUtils.resolveOpacities(
        [1, 2],
        config,
        [],
        0.5,
        loadTable,
      );

      expect(Array.from(result)).toEqual([255, 128]);
      expect(warnSpy).toHaveBeenCalledWith("Invalid opacity table value: bad");
    });

    it("clamps opacities loaded from table", async () => {
      const config: OpacityConfig = {
        from: { table: "opacity", column: "o" },
      };
      const table = createTableData([1, 2], { o: [-1, 2] });
      const loadTable = createLoadTable({ opacity: table });

      const result = await ResolveUtils.resolveOpacities(
        [1, 2],
        config,
        [],
        0,
        loadTable,
      );

      expect(Array.from(result)).toEqual([0, 255]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("warns and falls back when opacity map is missing", async () => {
      const config: OpacityConfig = {
        groupBy: { table: "groups", column: "group", map: "missing" },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });

      const result = await ResolveUtils.resolveOpacities(
        [1],
        config,
        [],
        0.25,
        loadTable,
      );

      expect(Array.from(result)).toEqual([64]);
      expect(warnSpy).toHaveBeenCalledWith("Opacity map missing not found");
    });

    it("falls back to default opacity when no config source is active", async () => {
      const config = {} as OpacityConfig;
      const loadTable = createLoadTable({});

      const result = await ResolveUtils.resolveOpacities(
        [1, 2],
        config,
        [],
        0.2,
        loadTable,
      );

      expect(Array.from(result)).toEqual([51, 51]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("resolveColors", () => {
    it("resolves constant colors and applies opacity/visibility", async () => {
      const config: ColorConfig = {
        constant: { value: { r: 1, g: 2, b: 3 } },
      };
      const loadTable = createLoadTable({});
      const visibilityData = new Uint8Array([1, 0]);
      const opacityData = new Uint8Array([128, 64]);

      const result = await ResolveUtils.resolveColors(
        [1, 2],
        config,
        [],
        { r: 0, g: 0, b: 0 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const packed = ColorUtils.packColor({ r: 1, g: 2, b: 3 });
      const expected = [
        MathUtils.safeLeftShift(packed, 8) + 128,
        MathUtils.safeLeftShift(packed, 8) + 0,
      ];
      expect(Array.from(result)).toEqual(expected);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("resolves colors from palette range", async () => {
      const config: ColorConfig = {
        from: {
          table: "colors",
          column: "c",
          palette: "batlow",
          range: [0, 10],
        },
      };
      const table = createTableData([1, 2], { c: [0, 10] });
      const loadTable = createLoadTable({ colors: table });
      const visibilityData = new Uint8Array([1, 1]);
      const opacityData = new Uint8Array([255, 255]);
      const palette = colorPalettes.find((p) => p.id === "batlow")!;

      const result = await ResolveUtils.resolveColors(
        [1, 2],
        config,
        [],
        { r: 0, g: 0, b: 0 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const color0 = palette.colors[0]!;
      const color1 = palette.colors[palette.colors.length - 1]!;
      const expected = [
        MathUtils.safeLeftShift(ColorUtils.packColor(color0), 8) + 255,
        MathUtils.safeLeftShift(ColorUtils.packColor(color1), 8) + 255,
      ];
      expect(Array.from(result)).toEqual(expected);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("computes color range from table values when range is missing", async () => {
      const config: ColorConfig = {
        from: { table: "colors", column: "c", palette: "batlow" },
      };
      const table = createTableData([1, 2], { c: [2, 8] });
      const loadTable = createLoadTable({ colors: table });
      const visibilityData = new Uint8Array([1, 1]);
      const opacityData = new Uint8Array([255, 255]);
      const palette = colorPalettes.find((p) => p.id === "batlow")!;

      const result = await ResolveUtils.resolveColors(
        [1, 2],
        config,
        [],
        { r: 0, g: 0, b: 0 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const index0 = MathUtils.clamp(
        Math.floor(((2 - 2) / (8 - 2)) * palette.colors.length),
        0,
        palette.colors.length - 1,
      );
      const index1 = MathUtils.clamp(
        Math.floor(((8 - 2) / (8 - 2)) * palette.colors.length),
        0,
        palette.colors.length - 1,
      );
      const expected = [
        MathUtils.safeLeftShift(
          ColorUtils.packColor(palette.colors[index0]!),
          8,
        ) + 255,
        MathUtils.safeLeftShift(
          ColorUtils.packColor(palette.colors[index1]!),
          8,
        ) + 255,
      ];
      expect(Array.from(result)).toEqual(expected);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("computes color range while ignoring non-numeric values", async () => {
      const config: ColorConfig = {
        from: { table: "colors", column: "c", palette: "batlow" },
      };
      const table = createTableData([1, 2, 3], { c: [1, "bad", 3] });
      const loadTable = createLoadTable({ colors: table });
      const visibilityData = new Uint8Array([1, 1, 1]);
      const opacityData = new Uint8Array([255, 255, 255]);
      const palette = colorPalettes.find((p) => p.id === "batlow")!;

      const result = await ResolveUtils.resolveColors(
        [1, 2, 3],
        config,
        [],
        { r: 0, g: 0, b: 0 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const index0 = MathUtils.clamp(
        Math.floor(((1 - 1) / (3 - 1)) * palette.colors.length),
        0,
        palette.colors.length - 1,
      );
      const index2 = MathUtils.clamp(
        Math.floor(((3 - 1) / (3 - 1)) * palette.colors.length),
        0,
        palette.colors.length - 1,
      );
      const expected = [
        MathUtils.safeLeftShift(
          ColorUtils.packColor(palette.colors[index0]!),
          8,
        ) + 255,
        MathUtils.safeLeftShift(ColorUtils.packColor({ r: 0, g: 0, b: 0 }), 8) +
          255,
        MathUtils.safeLeftShift(
          ColorUtils.packColor(palette.colors[index2]!),
          8,
        ) + 255,
      ];
      expect(Array.from(result)).toEqual(expected);
      expect(warnSpy).toHaveBeenCalledWith("Invalid color table value: bad");
    });

    it("warns and uses default range when color values have no spread", async () => {
      const config: ColorConfig = {
        from: { table: "colors", column: "c", palette: "batlow" },
      };
      const table = createTableData([1, 2], { c: [5, 5] });
      const loadTable = createLoadTable({ colors: table });
      const visibilityData = new Uint8Array([1, 1]);
      const opacityData = new Uint8Array([255, 255]);
      const palette = colorPalettes.find((p) => p.id === "batlow")!;

      const result = await ResolveUtils.resolveColors(
        [1, 2],
        config,
        [],
        { r: 0, g: 0, b: 0 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const colorIndex = MathUtils.clamp(
        Math.floor(5 * palette.colors.length),
        0,
        palette.colors.length - 1,
      );
      const expected =
        MathUtils.safeLeftShift(
          ColorUtils.packColor(palette.colors[colorIndex]!),
          8,
        ) + 255;
      expect(Array.from(result)).toEqual([expected, expected]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("warns on invalid color table values and falls back", async () => {
      const config: ColorConfig = {
        from: {
          table: "colors",
          column: "c",
          palette: "batlow",
          range: [0, 1],
        },
      };
      const table = createTableData([1], { c: ["bad"] });
      const loadTable = createLoadTable({ colors: table });
      const visibilityData = new Uint8Array([1]);
      const opacityData = new Uint8Array([255]);
      const defaultColor: Color = { r: 9, g: 9, b: 9 };

      const result = await ResolveUtils.resolveColors(
        [1],
        config,
        [],
        defaultColor,
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected =
        MathUtils.safeLeftShift(ColorUtils.packColor(defaultColor), 8) + 255;
      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).toHaveBeenCalledWith("Invalid color table value: bad");
    });

    it("warns and falls back when palette is missing", async () => {
      const config: ColorConfig = {
        from: { table: "colors", column: "c", palette: "missing" },
      };
      const table = createTableData([1], { c: [1] });
      const loadTable = createLoadTable({ colors: table });
      const visibilityData = new Uint8Array([1]);
      const opacityData = new Uint8Array([255]);
      const defaultColor: Color = { r: 9, g: 9, b: 9 };

      const result = await ResolveUtils.resolveColors(
        [1],
        config,
        [],
        defaultColor,
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected =
        MathUtils.safeLeftShift(ColorUtils.packColor(defaultColor), 8) + 255;
      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).toHaveBeenCalledWith("Color palette missing not found");
    });

    it("warns and falls back when color map is missing", async () => {
      const config: ColorConfig = {
        groupBy: { table: "groups", column: "group", map: "missing" },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });
      const visibilityData = new Uint8Array([1]);
      const opacityData = new Uint8Array([255]);

      const result = await ResolveUtils.resolveColors(
        [1],
        config,
        [],
        { r: 1, g: 1, b: 1 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected =
        MathUtils.safeLeftShift(ColorUtils.packColor({ r: 1, g: 1, b: 1 }), 8) +
        255;
      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).toHaveBeenCalledWith("Color map missing not found");
    });

    it("resolves colors from groupBy map", async () => {
      const config: ColorConfig = {
        groupBy: { table: "groups", column: "group", map: "color-map" },
      };
      const groupKey = JSON.stringify("A");
      const colorMaps: DefaultMap<Color>[] = [
        {
          id: "color-map",
          name: "Color Map",
          values: { [groupKey]: { r: 10, g: 20, b: 30 } },
          default: { r: 1, g: 1, b: 1 },
        },
      ];
      const table = createTableData([1, 2], { group: ["A", "B"] });
      const loadTable = createLoadTable({ groups: table });
      const visibilityData = new Uint8Array([1, 1]);
      const opacityData = new Uint8Array([64, 64]);

      const result = await ResolveUtils.resolveColors(
        [1, 2],
        config,
        colorMaps,
        { r: 0, g: 0, b: 0 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected = [
        MathUtils.safeLeftShift(
          ColorUtils.packColor({ r: 10, g: 20, b: 30 }),
          8,
        ) + 64,
        MathUtils.safeLeftShift(ColorUtils.packColor({ r: 1, g: 1, b: 1 }), 8) +
          64,
      ];
      expect(Array.from(result)).toEqual(expected);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("resolves colors from groupBy palette hash", async () => {
      const config: ColorConfig = {
        groupBy: {
          table: "groups",
          column: "group",
          map: undefined,
          palette: "batlowS",
        },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });
      const visibilityData = new Uint8Array([1]);
      const opacityData = new Uint8Array([200]);
      const palette = colorPalettes.find((p) => p.id === "batlowS")!;
      const groupKey = JSON.stringify("A");
      const expectedColor =
        palette.colors[HashUtils.djb2(groupKey) % palette.colors.length]!;

      const result = await ResolveUtils.resolveColors(
        [1],
        config,
        [],
        { r: 0, g: 0, b: 0 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected =
        MathUtils.safeLeftShift(ColorUtils.packColor(expectedColor), 8) + 200;
      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it("warns and falls back when groupBy palette is missing", async () => {
      const config: ColorConfig = {
        groupBy: {
          table: "groups",
          column: "group",
          map: undefined,
          palette: "missing",
        },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });
      const visibilityData = new Uint8Array([1]);
      const opacityData = new Uint8Array([255]);

      const result = await ResolveUtils.resolveColors(
        [1],
        config,
        [],
        { r: 2, g: 2, b: 2 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected =
        MathUtils.safeLeftShift(ColorUtils.packColor({ r: 2, g: 2, b: 2 }), 8) +
        255;
      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).toHaveBeenCalledWith("Color palette missing not found");
    });

    it("warns when no color map or palette is specified", async () => {
      const config: ColorConfig = {
        groupBy: { table: "groups", column: "group", map: undefined },
      };
      const table = createTableData([1], { group: ["A"] });
      const loadTable = createLoadTable({ groups: table });
      const visibilityData = new Uint8Array([1]);
      const opacityData = new Uint8Array([255]);

      const result = await ResolveUtils.resolveColors(
        [1],
        config,
        [],
        { r: 3, g: 3, b: 3 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected =
        MathUtils.safeLeftShift(ColorUtils.packColor({ r: 3, g: 3, b: 3 }), 8) +
        255;
      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).toHaveBeenCalledWith(
        "No color map or color palette specified",
      );
    });

    it("resolves colors from random palette with deterministic Math.random", async () => {
      const config: ColorConfig = {
        random: { palette: "batlowS" },
      };
      const loadTable = createLoadTable({});
      const visibilityData = new Uint8Array([1, 1]);
      const opacityData = new Uint8Array([1, 1]);
      const palette = colorPalettes.find((p) => p.id === "batlowS")!;
      const randomSpy = vi
        .spyOn(Math, "random")
        .mockReturnValueOnce(0.1)
        .mockReturnValueOnce(0.9);

      const result = await ResolveUtils.resolveColors(
        [1, 2],
        config,
        [],
        { r: 0, g: 0, b: 0 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const index0 = MathUtils.clamp(
        Math.floor(0.1 * palette.colors.length),
        0,
        palette.colors.length - 1,
      );
      const index1 = MathUtils.clamp(
        Math.floor(0.9 * palette.colors.length),
        0,
        palette.colors.length - 1,
      );
      const expected = [
        MathUtils.safeLeftShift(
          ColorUtils.packColor(palette.colors[index0]!),
          8,
        ) + 1,
        MathUtils.safeLeftShift(
          ColorUtils.packColor(palette.colors[index1]!),
          8,
        ) + 1,
      ];
      expect(Array.from(result)).toEqual(expected);
      expect(warnSpy).not.toHaveBeenCalled();
      randomSpy.mockRestore();
    });

    it("warns and falls back when random palette is missing", async () => {
      const config: ColorConfig = {
        random: { palette: "missing" },
      };
      const loadTable = createLoadTable({});
      const visibilityData = new Uint8Array([1]);
      const opacityData = new Uint8Array([255]);

      const result = await ResolveUtils.resolveColors(
        [1],
        config,
        [],
        { r: 4, g: 4, b: 4 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected =
        MathUtils.safeLeftShift(ColorUtils.packColor({ r: 4, g: 4, b: 4 }), 8) +
        255;
      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).toHaveBeenCalledWith("Color palette missing not found");
    });

    it("warns and falls back when no color config is active", async () => {
      const config = {} as ColorConfig;
      const loadTable = createLoadTable({});
      const visibilityData = new Uint8Array([1]);
      const opacityData = new Uint8Array([255]);

      const result = await ResolveUtils.resolveColors(
        [1],
        config,
        [],
        { r: 5, g: 5, b: 5 },
        loadTable,
        {},
        visibilityData,
        opacityData,
      );

      const expected =
        MathUtils.safeLeftShift(ColorUtils.packColor({ r: 5, g: 5, b: 5 }), 8) +
        255;
      expect(Array.from(result)).toEqual([expected]);
      expect(warnSpy).toHaveBeenCalledWith(
        "No valid color config found, using default color",
      );
    });
  });
});
