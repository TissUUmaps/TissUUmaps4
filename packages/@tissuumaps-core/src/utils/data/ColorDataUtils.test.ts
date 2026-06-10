import { describe, expect, it, vi } from "vitest";

import { type Color, type DefaultMap } from "../../model/types";
import { type ColorPalette, colorPalettes } from "../../palettes";
import { type TableData } from "../../storage/table";
import { ColorUtils } from "../ColorUtils";
import { MathUtils } from "../MathUtils";
import { ColorDataUtils } from "./ColorDataUtils";

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

describe("ColorDataUtils", () => {
  describe("encodeColor", () => {
    it("packs color via ColorUtils.packColor", () => {
      expect(ColorDataUtils.encodeColor(red)).toBe(ColorUtils.packColor(red));
      expect(ColorDataUtils.encodeColor(black)).toBe(0);
    });
  });

  describe("parseColorValue", () => {
    it("maps a value in the lower third of the range to the first color", () => {
      const result = ColorDataUtils.parseColorValue(
        0,
        [0, 3],
        undefined,
        testPalette,
      );
      expect(result).toEqual(red);
    });

    it("maps a value in the middle third to the second color", () => {
      const result = ColorDataUtils.parseColorValue(
        1.5,
        [0, 3],
        undefined,
        testPalette,
      );
      expect(result).toEqual(green);
    });

    it("maps a value at the maximum to the last color", () => {
      const result = ColorDataUtils.parseColorValue(
        3,
        [0, 3],
        undefined,
        testPalette,
      );
      expect(result).toEqual(blue);
    });

    it("uses configuredValueRange when provided", () => {
      const result = ColorDataUtils.parseColorValue(
        5,
        [0, 100],
        [0, 10],
        testPalette,
      );
      // 5/10 = 0.5, floor(0.5*3) = 1 → green
      expect(result).toEqual(green);
    });

    it("uses valueRange when configuredValueRange is undefined", () => {
      const result = ColorDataUtils.parseColorValue(
        50,
        [0, 100],
        undefined,
        testPalette,
      );
      // 50/100 = 0.5, floor(0.5*3) = 1 → green
      expect(result).toEqual(green);
    });

    it("defaults to [0, 1] when both ranges are undefined", () => {
      const result = ColorDataUtils.parseColorValue(
        0.5,
        undefined,
        undefined,
        testPalette,
      );
      // 0.5/1 = 0.5, floor(0.5*3) = 1 → green
      expect(result).toEqual(green);
    });

    it("clamps index to valid bounds for out-of-range values", () => {
      expect(
        ColorDataUtils.parseColorValue(-10, [0, 1], undefined, testPalette),
      ).toEqual(red);
      expect(
        ColorDataUtils.parseColorValue(100, [0, 1], undefined, testPalette),
      ).toEqual(blue);
    });

    it("returns undefined for non-finite values", () => {
      expect(
        ColorDataUtils.parseColorValue(NaN, [0, 1], undefined, testPalette),
      ).toBeUndefined();
      expect(
        ColorDataUtils.parseColorValue(
          Infinity,
          [0, 1],
          undefined,
          testPalette,
        ),
      ).toBeUndefined();
    });

    it("returns undefined for non-number values", () => {
      expect(
        ColorDataUtils.parseColorValue("abc", [0, 1], undefined, testPalette),
      ).toBeUndefined();
    });
  });

  describe("createUniformColorData", () => {
    it("creates a buffer filled with the encoded color", () => {
      const data = ColorDataUtils.createUniformColorData(3, red);
      const encoded = ColorDataUtils.encodeColor(red);
      expect(data).toBeInstanceOf(Uint32Array);
      expect(data.length).toBe(3);
      expect(data[0]).toBe(encoded);
      expect(data[1]).toBe(encoded);
      expect(data[2]).toBe(encoded);
    });

    it("respects alignment", () => {
      const data = ColorDataUtils.createUniformColorData(3, red, { align: 4 });
      expect(data.length).toBe(4); // aligned from 3 to 4
      expect(data[0]).toBe(ColorDataUtils.encodeColor(red));
    });

    it("returns empty buffer for size 0", () => {
      const data = ColorDataUtils.createUniformColorData(0, red);
      expect(data.length).toBe(0);
    });
  });

  describe("loadConstantColorData", () => {
    it("fills buffer with the constant color", () => {
      const config = {
        source: "constant" as const,
        constant: { value: green },
      };
      const data = ColorDataUtils.loadUniformColorData([1, 2, 3], config);
      const encoded = ColorDataUtils.encodeColor(green);
      expect(data.length).toBe(3);
      for (let i = 0; i < 3; i++) {
        expect(data[i]).toBe(encoded);
      }
    });
  });

  describe("loadFromColorData", () => {
    it("maps table values through the color palette", async () => {
      const palette = colorPalettes[0]!;
      const ids = [1, 2];
      const tableData = createMockTableData(ids, [0, 1], [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: {
          table: "t1",
          column: "col1",
          palette: palette.id,
          range: undefined,
        },
      };

      const data = await ColorDataUtils.loadColorDataFromTableValues(
        ids,
        config,
        black,
        loadTable,
        {},
      );
      // value 0: normalized to 0, index 0 → first palette color
      // value 1: normalized to 1, index clamped to last → last palette color
      expect(data[0]).toBe(ColorDataUtils.encodeColor(palette.colors[0]!));
      expect(data[1]).toBe(
        ColorDataUtils.encodeColor(palette.colors[palette.colors.length - 1]!),
      );
    });

    it("returns uniform default color when palette is not found", async () => {
      const ids = [1, 2];
      const loadTable = vi.fn();
      const config = {
        source: "from" as const,
        from: {
          table: "t1",
          column: "col1",
          palette: "nonexistent",
          range: undefined,
        },
      };

      const data = await ColorDataUtils.loadColorDataFromTableValues(
        ids,
        config,
        red,
        loadTable,
      );
      expect(data[0]).toBe(ColorDataUtils.encodeColor(red));
      expect(data[1]).toBe(ColorDataUtils.encodeColor(red));
    });
  });

  describe("loadGroupByColorData", () => {
    it("uses colorMap when map is specified and found", async () => {
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
        source: "groupBy" as const,
        groupBy: { column: "col1", map: "cm1" },
      };

      const data = await ColorDataUtils.loadColorDataFromTableGroups(
        ids,
        config,
        [colorMap],
        [testPalette],
        black,
        loadTable,
      );

      expect(data[0]).toBe(ColorDataUtils.encodeColor(red));
      expect(data[1]).toBe(ColorDataUtils.encodeColor(green));
    });

    it("returns uniform default color when map is specified but not found", async () => {
      const ids = [1];
      const config = {
        source: "groupBy" as const,
        groupBy: {
          table: "t1",
          column: "col1",
          map: "nonexistent",
        },
      };

      const data = await ColorDataUtils.loadColorDataFromTableGroups(
        ids,
        config,
        [],
        [],
        red,
        vi.fn(),
      );

      expect(data[0]).toBe(ColorDataUtils.encodeColor(red));
    });

    it("uses palette when palette is specified (no map)", async () => {
      const ids = [1, 2];
      const tableData = createMockTableData(ids, ["groupA", "groupB"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "groupBy" as const,
        groupBy: {
          table: "t1",
          column: "col1",
          map: undefined,
          palette: testPalette.id,
        },
      };

      const data = await ColorDataUtils.loadColorDataFromTableGroups(
        ids,
        config,
        [],
        [testPalette],
        black,
        loadTable,
      );

      // Colors are hash-based from the palette, so just verify they're valid encoded colors
      expect(data[0]).toBeGreaterThanOrEqual(0);
      expect(data[1]).toBeGreaterThanOrEqual(0);
    });

    it("returns uniform default color when palette is specified but not found", async () => {
      const ids = [1];
      const config = {
        source: "groupBy" as const,
        groupBy: {
          table: "t1",
          column: "col1",
          map: undefined,
          palette: "nonexistent",
        },
      };

      const data = await ColorDataUtils.loadColorDataFromTableGroups(
        ids,
        config,
        [],
        [],
        red,
        vi.fn(),
      );

      expect(data[0]).toBe(ColorDataUtils.encodeColor(red));
    });

    it("returns uniform default color when neither map nor palette is specified", async () => {
      const ids = [1];
      const config = {
        source: "groupBy" as const,
        groupBy: {
          table: "t1",
          column: "col1",
          map: undefined,
          palette: undefined,
        },
      };

      const data = await ColorDataUtils.loadColorDataFromTableGroups(
        ids,
        config,
        [],
        [],
        green,
        vi.fn(),
      );

      expect(data[0]).toBe(ColorDataUtils.encodeColor(green));
    });
  });

  describe("loadRandomColorData", () => {
    it("returns buffer with colors from the palette", async () => {
      const palette = colorPalettes[0]!;
      const ids = [1, 2, 3];
      const config = {
        source: "random" as const,
        random: { palette: palette.id },
      };

      const data = await ColorDataUtils.loadRandomColorData(ids, config, black);

      expect(data.length).toBe(3);
      const validEncodings = palette.colors.map((c) =>
        ColorDataUtils.encodeColor(c),
      );
      for (let i = 0; i < 3; i++) {
        expect(validEncodings).toContain(data[i]);
      }
    });

    it("returns uniform default color when palette is not found", async () => {
      const ids = [1, 2];
      const config = {
        source: "random" as const,
        random: { palette: "nonexistent" },
      };

      const data = await ColorDataUtils.loadRandomColorData(ids, config, red);

      expect(data[0]).toBe(ColorDataUtils.encodeColor(red));
      expect(data[1]).toBe(ColorDataUtils.encodeColor(red));
    });
  });

  describe("loadColorData", () => {
    it("dispatches to constant and applies visibility/opacity", async () => {
      const ids = [1, 2];
      const config = {
        source: "constant" as const,
        constant: { value: red },
      };
      const visibilityData = new Uint8Array([1, 0]);
      const opacityData = new Uint8Array([200, 150]);

      const data = await ColorDataUtils.loadColorData(
        ids,
        config,
        [],
        black,
        vi.fn(),
        { visibilityData, opacityData },
      );

      const encodedRed = ColorDataUtils.encodeColor(red);
      // ID 1: visible, so (encoded << 8) + opacity
      expect(data[0]).toBe(MathUtils.safeLeftShift(encodedRed, 8) + 200);
      // ID 2: not visible, so (encoded << 8) + 0
      expect(data[1]).toBe(MathUtils.safeLeftShift(encodedRed, 8));
    });

    it("uses 255 as default alpha when opacityData is not provided", async () => {
      const ids = [1];
      const config = {
        source: "constant" as const,
        constant: { value: green },
      };

      const data = await ColorDataUtils.loadColorData(
        ids,
        config,
        [],
        black,
        vi.fn(),
      );

      const encoded = ColorDataUtils.encodeColor(green);
      expect(data[0]).toBe(MathUtils.safeLeftShift(encoded, 8) + 255);
    });

    it("dispatches to from config", async () => {
      const ids = [1];
      const palette = colorPalettes[0]!;
      const tableData = createMockTableData([1], [0], [0, 1]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const config = {
        source: "from" as const,
        from: { column: "col1", palette: palette.id },
      };

      const data = await ColorDataUtils.loadColorData(
        ids,
        config,
        [],
        black,
        loadTable,
        { table: "t1" },
      );

      expect(data.length).toBe(1);
      // Just verify it produced a valid packed value with alpha
      expect(data[0]).toBeGreaterThan(0);
    });

    it("dispatches to random config", async () => {
      const palette = colorPalettes[0]!;
      const ids = [1];
      const config = {
        source: "random" as const,
        random: { palette: palette.id },
      };

      const data = await ColorDataUtils.loadColorData(
        ids,
        config,
        [],
        black,
        vi.fn(),
      );

      expect(data.length).toBe(1);
      expect(data[0]).toBeGreaterThan(0);
    });

    it("dispatches to groupBy config", async () => {
      const ids = [1];
      const tableData = createMockTableData(ids, ["cat-a"]);
      const loadTable = vi.fn().mockResolvedValue(tableData);
      const colorMap: DefaultMap<Color> = {
        id: "cm1",
        name: "CM",
        values: { [JSON.stringify("cat-a")]: red },
      };
      const config = {
        source: "groupBy" as const,
        groupBy: { column: "col1", map: "cm1" },
      };

      const data = await ColorDataUtils.loadColorData(
        ids,
        config,
        [colorMap],
        black,
        loadTable,
        { table: "t1" },
      );

      const encoded = ColorDataUtils.encodeColor(red);
      expect(data[0]).toBe(MathUtils.safeLeftShift(encoded, 8) + 255);
    });

    it("falls back to default color for unknown config", async () => {
      const ids = [1];
      const config = {} as never;

      const data = await ColorDataUtils.loadColorData(
        ids,
        config,
        [],
        red,
        vi.fn(),
      );

      const encoded = ColorDataUtils.encodeColor(red);
      expect(data[0]).toBe(MathUtils.safeLeftShift(encoded, 8) + 255);
    });

    it("throws when signal is already aborted", async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(
        ColorDataUtils.loadColorData(
          [1],
          { source: "constant" as const, constant: { value: red } },
          [],
          black,
          vi.fn(),
          { signal: controller.signal },
        ),
      ).rejects.toThrow();
    });
  });
});
