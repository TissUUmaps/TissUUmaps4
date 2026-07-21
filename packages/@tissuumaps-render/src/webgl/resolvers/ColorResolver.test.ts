import { describe, expect, it, vi } from "vitest";

import {
  type Color,
  type ColorConfig,
  type ColorPalette,
  ColorUtils,
  type DefaultMap,
  HashUtils,
  MathUtils,
  type TableData,
  colorPalettes,
} from "@tissuumaps/core";

import { ColorResolver } from "./ColorResolver";

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

const red: Color = { r: 255, g: 0, b: 0 };
const green: Color = { r: 0, g: 255, b: 0 };
const blue: Color = { r: 0, g: 0, b: 255 };
const black: Color = { r: 0, g: 0, b: 0 };

const testPalette: ColorPalette = {
  id: "test-palette",
  name: "Test",
  colors: [red, green, blue],
};

describe("ColorResolver", () => {
  describe("encodeColor", () => {
    it("packs the color via ColorUtils.packColor", () => {
      expect(ColorResolver.encodeColor(red)).toBe(ColorUtils.packColor(red));
      expect(ColorResolver.encodeColor(black)).toBe(0);
    });
  });

  describe("parseColor", () => {
    it("maps a value in the lower third of the range to the first color", () => {
      expect(
        ColorResolver.parseColor(0, [0, 3], undefined, testPalette),
      ).toEqual(red);
    });

    it("maps a value in the middle third to the second color", () => {
      expect(
        ColorResolver.parseColor(1.5, [0, 3], undefined, testPalette),
      ).toEqual(green);
    });

    it("maps a value at the maximum to the last color", () => {
      expect(
        ColorResolver.parseColor(3, [0, 3], undefined, testPalette),
      ).toEqual(blue);
    });

    it("prefers the configured value range over the data range", () => {
      // 5/10 = 0.5, floor(0.5*3) = 1 → green
      expect(
        ColorResolver.parseColor(5, [0, 100], [0, 10], testPalette),
      ).toEqual(green);
    });

    it("uses the data value range when no configured range is given", () => {
      // 50/100 = 0.5, floor(0.5*3) = 1 → green
      expect(
        ColorResolver.parseColor(50, [0, 100], undefined, testPalette),
      ).toEqual(green);
    });

    it("defaults to [0, 1] when both ranges are undefined", () => {
      // 0.5/1 = 0.5, floor(0.5*3) = 1 → green
      expect(
        ColorResolver.parseColor(0.5, undefined, undefined, testPalette),
      ).toEqual(green);
    });

    it("clamps the index for out-of-range values", () => {
      expect(
        ColorResolver.parseColor(-10, [0, 1], undefined, testPalette),
      ).toEqual(red);
      expect(
        ColorResolver.parseColor(100, [0, 1], undefined, testPalette),
      ).toEqual(blue);
    });

    it("returns undefined for non-finite values", () => {
      expect(
        ColorResolver.parseColor(NaN, [0, 1], undefined, testPalette),
      ).toBeUndefined();
      expect(
        ColorResolver.parseColor(Infinity, [0, 1], undefined, testPalette),
      ).toBeUndefined();
    });

    it("returns undefined for non-number values", () => {
      expect(
        ColorResolver.parseColor("abc", [0, 1], undefined, testPalette),
      ).toBeUndefined();
    });
  });

  describe("createColorBuffer", () => {
    it("creates a zeroed Uint32Array of the requested size", () => {
      const data = ColorResolver.createColorBuffer(3);
      expect(data).toBeInstanceOf(Uint32Array);
      expect(data.length).toBe(3);
      expect(Array.from(data)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(ColorResolver.createColorBuffer(3, { align: 4 }).length).toBe(4);
    });
  });

  describe("createUniformColors", () => {
    it("fills the buffer with the encoded color", () => {
      const data = ColorResolver.createUniformColors(3, red);
      const encoded = ColorResolver.encodeColor(red);
      expect(data.length).toBe(3);
      expect(Array.from(data)).toEqual([encoded, encoded, encoded]);
    });

    it("respects alignment while filling only the requested count", () => {
      const data = ColorResolver.createUniformColors(3, red, { align: 4 });
      const encoded = ColorResolver.encodeColor(red);
      expect(data.length).toBe(4);
      expect(data[0]).toBe(encoded);
      expect(data[2]).toBe(encoded);
      expect(data[3]).toBe(0); // padding element is left zeroed
    });

    it("returns an empty buffer for size 0", () => {
      expect(ColorResolver.createUniformColors(0, red).length).toBe(0);
    });
  });

  describe("resolveUniformColors", () => {
    it("fills the buffer with the constant color", () => {
      const config = { constant: { value: green } } satisfies ColorConfig;
      const data = ColorResolver.resolveUniformColors([1, 2, 3], config);
      const encoded = ColorResolver.encodeColor(green);
      expect(Array.from(data)).toEqual([encoded, encoded, encoded]);
    });
  });

  describe("resolveColorsFromTableValues", () => {
    it("maps table values through the color palette", async () => {
      const palette = colorPalettes[0]!;
      const ids = [1, 2];
      const tableData = createMockTableData(ids, [0, 1], [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        from: { column: "col1", palette: palette.id },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColorsFromTableValues(
        ids,
        config,
        black,
        loadTable,
      );

      // value 0 → normalized 0 → first color; value 1 → clamped to last color
      expect(data[0]).toBe(ColorResolver.encodeColor(palette.colors[0]!));
      expect(data[1]).toBe(
        ColorResolver.encodeColor(palette.colors[palette.colors.length - 1]!),
      );
    });

    it("returns uniform default color when the palette is not found", async () => {
      const ids = [1, 2];
      const config = {
        from: { column: "col1", palette: "nonexistent" },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColorsFromTableValues(
        ids,
        config,
        red,
        vi.fn(),
      );

      const encoded = ColorResolver.encodeColor(red);
      expect(Array.from(data)).toEqual([encoded, encoded]);
    });
  });

  describe("resolveColorsFromTableGroups", () => {
    it("uses the color map when a map is specified and found", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["cat-a", "cat-b"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const colorMap: DefaultMap<Color> = {
        id: "cm1",
        name: "Color Map 1",
        values: {
          [JSON.stringify("cat-a")]: red,
          [JSON.stringify("cat-b")]: green,
        },
      };
      const config = {
        groupBy: { column: "col1", map: "cm1" },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColorsFromTableGroups(
        ids,
        config,
        [colorMap],
        [testPalette],
        black,
        loadTable,
      );

      expect(data[0]).toBe(ColorResolver.encodeColor(red));
      expect(data[1]).toBe(ColorResolver.encodeColor(green));
    });

    it("uses the color map's default for unmapped groups", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["missing"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const colorMap: DefaultMap<Color> = {
        id: "cm1",
        name: "Color Map 1",
        values: {},
        default: blue,
      };
      const config = {
        groupBy: { column: "col1", map: "cm1" },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColorsFromTableGroups(
        ids,
        config,
        [colorMap],
        [testPalette],
        black,
        loadTable,
      );

      expect(data[0]).toBe(ColorResolver.encodeColor(blue));
    });

    it("returns uniform default color when a map is specified but not found", async () => {
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColorsFromTableGroups(
        [1],
        config,
        [],
        [],
        red,
        vi.fn(),
      );

      expect(data[0]).toBe(ColorResolver.encodeColor(red));
    });

    it("hashes group names through the palette when only a palette is given", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["groupA", "groupB"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        groupBy: { column: "col1", map: undefined, palette: testPalette.id },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColorsFromTableGroups(
        ids,
        config,
        [],
        [testPalette],
        black,
        loadTable,
      );

      // Colors are deterministically hash-picked from the palette
      expect(data[0]).toBe(
        ColorResolver.encodeColor(
          HashUtils.djb2Pick(testPalette.colors, JSON.stringify("groupA")),
        ),
      );
      expect(data[1]).toBe(
        ColorResolver.encodeColor(
          HashUtils.djb2Pick(testPalette.colors, JSON.stringify("groupB")),
        ),
      );
    });

    it("returns uniform default color when a palette is specified but not found", async () => {
      const config = {
        groupBy: { column: "col1", map: undefined, palette: "nonexistent" },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColorsFromTableGroups(
        [1],
        config,
        [],
        [],
        red,
        vi.fn(),
      );

      expect(data[0]).toBe(ColorResolver.encodeColor(red));
    });

    it("returns uniform default color when neither map nor palette is given", async () => {
      const config = {
        groupBy: { column: "col1", map: undefined },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColorsFromTableGroups(
        [1],
        config,
        [],
        [],
        green,
        vi.fn(),
      );

      expect(data[0]).toBe(ColorResolver.encodeColor(green));
    });
  });

  describe("resolveRandomColors", () => {
    // resolveRandomColors samples from the built-in colorPalettes, not a parameter
    const builtInPalette = colorPalettes[0]!;

    it("assigns colors drawn from the palette", async () => {
      const config = {
        random: { palette: builtInPalette.id },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveRandomColors(
        [1, 2, 3],
        config,
        black,
        {
          signal: undefined,
          align: 1,
        },
      );

      expect(data.length).toBe(3);
      const valid = builtInPalette.colors.map((c) =>
        ColorResolver.encodeColor(c),
      );
      for (const value of data) {
        expect(valid).toContain(value);
      }
    });

    it("draws the sampled color deterministically from Math.random", async () => {
      const spy = vi.spyOn(Math, "random").mockReturnValue(0); // → index 0
      try {
        const config = {
          random: { palette: builtInPalette.id },
        } satisfies ColorConfig;
        const data = await ColorResolver.resolveRandomColors(
          [1],
          config,
          black,
        );
        expect(data[0]).toBe(
          ColorResolver.encodeColor(builtInPalette.colors[0]!),
        );
      } finally {
        spy.mockRestore();
      }
    });

    it("returns uniform default color when the palette is not found", async () => {
      const config = {
        random: { palette: "nonexistent" },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveRandomColors([1, 2], config, red);

      const encoded = ColorResolver.encodeColor(red);
      expect(Array.from(data)).toEqual([encoded, encoded]);
    });
  });

  describe("resolveColors", () => {
    it("dispatches to constant and applies visibility and opacity", async () => {
      const ids = [1, 2];
      const config = { constant: { value: red } } satisfies ColorConfig;
      const visibilities = new Uint8Array([1, 0]);
      const opacities = new Uint8Array([200, 150]);

      const data = await ColorResolver.resolveColors(
        ids,
        config,
        [],
        black,
        vi.fn(),
        { visibilities, opacities },
      );

      const encodedRed = ColorResolver.encodeColor(red);
      // ID 1: visible → (color << 8) + opacity
      expect(data[0]).toBe(MathUtils.safeLeftShift(encodedRed, 8) + 200);
      // ID 2: not visible → (color << 8) + 0
      expect(data[1]).toBe(MathUtils.safeLeftShift(encodedRed, 8));
    });

    it("uses full alpha (255) when no opacity data is given", async () => {
      const config = { constant: { value: green } } satisfies ColorConfig;

      const data = await ColorResolver.resolveColors(
        [1],
        config,
        [],
        black,
        vi.fn(),
      );

      const encoded = ColorResolver.encodeColor(green);
      expect(data[0]).toBe(MathUtils.safeLeftShift(encoded, 8) + 255);
    });

    it("dispatches to from config when a table is given", async () => {
      const palette = colorPalettes[0]!;
      const tableData = createMockTableData([1], [0], [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        from: { column: "col1", palette: palette.id },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColors(
        [1],
        config,
        [],
        black,
        loadTable,
        { table: "t1" },
      );

      expect(loadTable).toHaveBeenCalled();
      const expectedColor = palette.colors[0]!;
      expect(data[0]).toBe(
        MathUtils.safeLeftShift(ColorResolver.encodeColor(expectedColor), 8) +
          255,
      );
    });

    it("dispatches to groupBy config when a table is given", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["cat-a"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const colorMap: DefaultMap<Color> = {
        id: "cm1",
        name: "CM",
        values: { [JSON.stringify("cat-a")]: red },
      };
      const config = {
        groupBy: { column: "col1", map: "cm1" },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColors(
        ids,
        config,
        [colorMap],
        black,
        loadTable,
        { table: "t1" },
      );

      expect(data[0]).toBe(
        MathUtils.safeLeftShift(ColorResolver.encodeColor(red), 8) + 255,
      );
    });

    it("dispatches to random config", async () => {
      const config = {
        random: { palette: testPalette.id },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColors(
        [1],
        config,
        [],
        black,
        vi.fn(),
      );

      expect(data.length).toBe(1);
      // low byte is the (full) alpha, upper bytes carry a palette color
      expect(data[0]! & 0xff).toBe(255);
    });

    it("falls back to the default color when the config has no active source", async () => {
      const config = {} as ColorConfig;

      const data = await ColorResolver.resolveColors(
        [1],
        config,
        [],
        red,
        vi.fn(),
      );

      expect(data[0]).toBe(
        MathUtils.safeLeftShift(ColorResolver.encodeColor(red), 8) + 255,
      );
    });

    it("does not load the table for a from config without a table id", async () => {
      const loadTable = vi.fn();
      const config = {
        from: { column: "col1", palette: colorPalettes[0]!.id },
      } satisfies ColorConfig;

      const data = await ColorResolver.resolveColors(
        [1],
        config,
        [],
        red,
        loadTable,
      );

      expect(loadTable).not.toHaveBeenCalled();
      // Falls through to the default color
      expect(data[0]).toBe(
        MathUtils.safeLeftShift(ColorResolver.encodeColor(red), 8) + 255,
      );
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = { constant: { value: red } } satisfies ColorConfig;

      await expect(
        ColorResolver.resolveColors([1], config, [], black, vi.fn(), {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
