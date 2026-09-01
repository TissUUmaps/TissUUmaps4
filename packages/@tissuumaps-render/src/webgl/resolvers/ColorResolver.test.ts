import { describe, expect, it, vi } from "vitest";

import {
  type Color,
  type ColorConfig,
  type ColorPalette,
  ColorUtils,
  type DefaultMap,
  HashUtils,
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

    it("maps every value onto the first color for an empty range", () => {
      expect(
        ColorResolver.parseColor(5, undefined, [5, 5], testPalette),
      ).toEqual(red);
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
      const buffer = ColorResolver.createColorBuffer(3);
      expect(buffer).toBeInstanceOf(Uint32Array);
      expect(buffer.length).toBe(3);
      expect(Array.from(buffer)).toEqual([0, 0, 0]);
    });

    it("aligns the buffer size to the given boundary", () => {
      expect(ColorResolver.createColorBuffer(3, { align: 4 }).length).toBe(4);
    });
  });

  describe("createUniformColors", () => {
    it("fills the buffer with the encoded color", () => {
      const buffer = ColorResolver.createUniformColors(3, red);
      const encoded = ColorResolver.encodeColor(red);
      expect(buffer.length).toBe(3);
      expect(Array.from(buffer)).toEqual([encoded, encoded, encoded]);
    });

    it("respects alignment while filling only the requested count", () => {
      const buffer = ColorResolver.createUniformColors(3, red, { align: 4 });
      const encoded = ColorResolver.encodeColor(red);
      expect(buffer.length).toBe(4);
      expect(buffer[0]).toBe(encoded);
      expect(buffer[2]).toBe(encoded);
      expect(buffer[3]).toBe(0); // padding element is left zeroed
    });

    it("returns an empty buffer for size 0", () => {
      expect(ColorResolver.createUniformColors(0, red).length).toBe(0);
    });
  });

  describe("resolveUniformColors", () => {
    it("fills the buffer with the constant color", () => {
      const config = { constant: { value: green } } satisfies ColorConfig;
      const buffer = ColorResolver.resolveUniformColors([1, 2, 3], config);
      const encoded = ColorResolver.encodeColor(green);
      expect(Array.from(buffer)).toEqual([encoded, encoded, encoded]);
    });
  });

  describe("resolveColorsFromTableValues", () => {
    it("maps table values through the color palette", async () => {
      const palette = colorPalettes[0]!;
      const ids = [1, 2];
      const data = createMockTableData(ids, [0, 1], [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = {
        from: { column: "col1", palette: palette.id },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColorsFromTableValues(
        ids,
        config,
        black,
        loadTable,
      );

      // value 0 → normalized 0 → first color; value 1 → clamped to last color
      expect(buffer[0]).toBe(ColorResolver.encodeColor(palette.colors[0]!));
      expect(buffer[1]).toBe(
        ColorResolver.encodeColor(palette.colors[palette.colors.length - 1]!),
      );
    });

    it("returns uniform default color when the palette is not found", async () => {
      const loadTable = vi.fn();
      const config = {
        from: { column: "col1", palette: "nonexistent" },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColorsFromTableValues(
        [1, 2],
        config,
        red,
        loadTable,
      );

      const encoded = ColorResolver.encodeColor(red);
      expect(Array.from(buffer)).toEqual([encoded, encoded]);
      expect(loadTable).not.toHaveBeenCalled();
    });

    it("forwards the signal to loadTable", async () => {
      const controller = new AbortController();
      const palette = colorPalettes[0]!;
      const data = createMockTableData([1], [0], [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = {
        from: { column: "col1", palette: palette.id },
      } satisfies ColorConfig;

      await ColorResolver.resolveColorsFromTableValues(
        [1],
        config,
        black,
        loadTable,
        { signal: controller.signal },
      );

      expect(loadTable).toHaveBeenCalledWith({ signal: controller.signal });
    });
  });

  describe("resolveColorsFromTableGroups", () => {
    it("uses the color map when a map is specified and found", async () => {
      const ids = [1, 2];
      const data = createMockTableData(ids, ["cat-a", "cat-b"]);
      const loadTable = vi.fn().mockResolvedValue(data);
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

      const buffer = await ColorResolver.resolveColorsFromTableGroups(
        ids,
        config,
        [colorMap],
        black,
        loadTable,
      );

      expect(buffer[0]).toBe(ColorResolver.encodeColor(red));
      expect(buffer[1]).toBe(ColorResolver.encodeColor(green));
    });

    it("uses the color map's default for unmapped groups", async () => {
      const ids = [1];
      const data = createMockTableData(ids, ["missing"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const colorMap: DefaultMap<Color> = {
        id: "cm1",
        name: "Color Map 1",
        values: {},
        default: blue,
      };
      const config = {
        groupBy: { column: "col1", map: "cm1" },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColorsFromTableGroups(
        ids,
        config,
        [colorMap],
        black,
        loadTable,
      );

      expect(buffer[0]).toBe(ColorResolver.encodeColor(blue));
    });

    it("returns uniform default color when a map is specified but not found", async () => {
      const loadTable = vi.fn();
      const config = {
        groupBy: { column: "col1", map: "nonexistent" },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColorsFromTableGroups(
        [1],
        config,
        [],
        red,
        loadTable,
      );

      expect(buffer[0]).toBe(ColorResolver.encodeColor(red));
      expect(loadTable).not.toHaveBeenCalled();
    });

    it("hashes group names through the palette when only a palette is given", async () => {
      // resolveColorsFromTableGroups looks palettes up in the built-in
      // colorPalettes, rather than in a parameter
      const builtInPalette = colorPalettes[0]!;
      const ids = [1, 2];
      const data = createMockTableData(ids, ["groupA", "groupB"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = {
        groupBy: { column: "col1", map: undefined, palette: builtInPalette.id },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColorsFromTableGroups(
        ids,
        config,
        [],
        black,
        loadTable,
      );

      // Colors are deterministically hash-picked from the palette
      expect(buffer[0]).toBe(
        ColorResolver.encodeColor(
          HashUtils.djb2Pick(builtInPalette.colors, JSON.stringify("groupA")),
        ),
      );
      expect(buffer[1]).toBe(
        ColorResolver.encodeColor(
          HashUtils.djb2Pick(builtInPalette.colors, JSON.stringify("groupB")),
        ),
      );
    });

    it("returns uniform default color when a palette is specified but not found", async () => {
      const loadTable = vi.fn();
      const config = {
        groupBy: { column: "col1", map: undefined, palette: "nonexistent" },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColorsFromTableGroups(
        [1],
        config,
        [],
        red,
        loadTable,
      );

      expect(buffer[0]).toBe(ColorResolver.encodeColor(red));
      expect(loadTable).not.toHaveBeenCalled();
    });

    it("returns uniform default color when neither map nor palette is given", async () => {
      const loadTable = vi.fn();
      const config = {
        groupBy: { column: "col1", map: undefined },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColorsFromTableGroups(
        [1],
        config,
        [],
        green,
        loadTable,
      );

      expect(buffer[0]).toBe(ColorResolver.encodeColor(green));
      expect(loadTable).not.toHaveBeenCalled();
    });
  });

  describe("resolveRandomColors", () => {
    // resolveRandomColors samples from the built-in colorPalettes, not a parameter
    const builtInPalette = colorPalettes[0]!;

    it("assigns colors drawn from the palette", async () => {
      const config = {
        random: { palette: builtInPalette.id },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveRandomColors(
        [1, 2, 3],
        config,
        black,
        { signal: undefined, align: 1 },
      );

      expect(buffer.length).toBe(3);
      const valid = builtInPalette.colors.map((color) =>
        ColorResolver.encodeColor(color),
      );
      for (const value of buffer) {
        expect(valid).toContain(value);
      }
    });

    it("draws the sampled color deterministically from Math.random", async () => {
      const random = vi.spyOn(Math, "random").mockReturnValue(0); // → index 0
      try {
        const config = {
          random: { palette: builtInPalette.id },
        } satisfies ColorConfig;
        const buffer = await ColorResolver.resolveRandomColors(
          [1],
          config,
          black,
        );
        expect(buffer[0]).toBe(
          ColorResolver.encodeColor(builtInPalette.colors[0]!),
        );
      } finally {
        random.mockRestore();
      }
    });

    it("returns uniform default color when the palette is not found", async () => {
      const config = {
        random: { palette: "nonexistent" },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveRandomColors(
        [1, 2],
        config,
        red,
      );

      const encoded = ColorResolver.encodeColor(red);
      expect(Array.from(buffer)).toEqual([encoded, encoded]);
    });
  });

  describe("resolveColors", () => {
    it("dispatches to constant, leaving the alpha channel to the caller", async () => {
      const ids = [1, 2];
      const config = { constant: { value: red } } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColors(ids, config, [], black);

      const encodedRed = ColorResolver.encodeColor(red);
      expect(Array.from(buffer)).toEqual([encodedRed, encodedRed]);
    });

    it("dispatches to from config when loadTable is given", async () => {
      const palette = colorPalettes[0]!;
      const data = createMockTableData([1], [0], [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const config = {
        from: { column: "col1", palette: palette.id },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColors([1], config, [], black, {
        loadTable,
      });

      expect(loadTable).toHaveBeenCalledOnce();
      const expectedColor = palette.colors[0]!;
      expect(buffer[0]).toBe(ColorResolver.encodeColor(expectedColor));
    });

    it("dispatches to groupBy config when loadTable is given", async () => {
      const ids = [1];
      const data = createMockTableData(ids, ["cat-a"]);
      const loadTable = vi.fn().mockResolvedValue(data);
      const colorMap: DefaultMap<Color> = {
        id: "cm1",
        name: "CM",
        values: { [JSON.stringify("cat-a")]: red },
      };
      const config = {
        groupBy: { column: "col1", map: "cm1" },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColors(
        ids,
        config,
        [colorMap],
        black,
        { loadTable },
      );

      expect(loadTable).toHaveBeenCalledOnce();
      expect(buffer[0]).toBe(ColorResolver.encodeColor(red));
    });

    it("dispatches to random config", async () => {
      // resolveRandomColors samples from the built-in colorPalettes, not a
      // parameter, so a palette that is not among them falls back to the default
      const builtInPalette = colorPalettes[0]!;
      const config = {
        random: { palette: builtInPalette.id },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColors([1], config, [], black);

      expect(buffer.length).toBe(1);
      expect(
        builtInPalette.colors.map((color) => ColorResolver.encodeColor(color)),
      ).toContain(buffer[0]);
    });

    it("falls back to the default color when the config has no active source", async () => {
      const config = {} as ColorConfig;

      const buffer = await ColorResolver.resolveColors([1], config, [], red);

      expect(buffer[0]).toBe(ColorResolver.encodeColor(red));
    });

    it("falls back to the default color for a from config without loadTable", async () => {
      const config = {
        from: { column: "col1", palette: colorPalettes[0]!.id },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColors([1], config, [], red);

      expect(buffer[0]).toBe(ColorResolver.encodeColor(red));
    });

    it("falls back to the default color for a groupBy config without loadTable", async () => {
      const colorMap: DefaultMap<Color> = {
        id: "cm1",
        name: "CM",
        values: { [JSON.stringify("cat-a")]: green },
      };
      const config = {
        groupBy: { column: "col1", map: "cm1" },
      } satisfies ColorConfig;

      const buffer = await ColorResolver.resolveColors(
        [1],
        config,
        [colorMap],
        red,
        {},
      );

      expect(buffer[0]).toBe(ColorResolver.encodeColor(red));
    });

    it("throws when the signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();
      const config = { constant: { value: red } } satisfies ColorConfig;

      await expect(
        ColorResolver.resolveColors([1], config, [], black, {
          signal: controller.signal,
        }),
      ).rejects.toThrow();
    });
  });
});
