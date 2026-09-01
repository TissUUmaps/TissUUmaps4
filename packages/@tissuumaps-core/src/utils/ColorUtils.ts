import type { Color } from "../model/primitives";

/** Utility methods for color parsing, packing, and conversion */
export class ColorUtils {
  /**
   * Parses a text-based color palette into an array of colors
   *
   * Each non-empty line is expected to contain three numeric components
   * separated by `sep`, scaled from `[0, maxValue]` to `[0, 255]`.
   *
   * @param str - Multi-line palette string
   * @param options - Component separator (default `" "`) and maximum input
   * value per component (default `1`)
   * @returns The parsed colors, in the order of the palette's lines
   * @throws Error if a non-empty line does not hold exactly three components
   */
  static parseColorPalette(
    str: string,
    options?: { sep?: string; maxValue?: number },
  ): Color[] {
    const { sep = " ", maxValue = 1 } = options ?? {};
    return str
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line, i) => {
        const values = line.split(sep);
        if (values.length !== 3) {
          throw new Error(`Invalid color palette line ${i}: ${line}`);
        }
        return {
          r: (Number(values[0]) / maxValue) * 255,
          g: (Number(values[1]) / maxValue) * 255,
          b: (Number(values[2]) / maxValue) * 255,
        };
      });
  }

  /**
   * Packs an RGB color into a single 24-bit integer (`0xRRGGBB`)
   *
   * @param color - The color to pack
   * @returns The packed color
   */
  static packColor(color: Color): number {
    return (color.r << 16) | (color.g << 8) | color.b;
  }

  /**
   * Parses a hex color string into a {@link Color}
   *
   * @param hex - A `#RRGGBB` hex string
   * @returns The parsed color
   * @throws Error if the string is not a valid 6-digit hex color
   */
  static fromHex(hex: string): Color {
    if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  /**
   * Formats a {@link Color} as a `#RRGGBB` hex string
   *
   * @param color - The color to format
   * @returns The formatted hex string
   */
  static toHex(color: Color): string {
    const rHex = Math.round(color.r).toString(16).padStart(2, "0");
    const gHex = Math.round(color.g).toString(16).padStart(2, "0");
    const bHex = Math.round(color.b).toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}`;
  }

  /**
   * Checks whether two colors have identical RGB components
   *
   * Components are compared exactly, without rounding or tolerance.
   *
   * @param a - The first color
   * @param b - The second color
   * @returns `true` if all three components are equal, `false` otherwise
   */
  static colorsEqual(a: Color, b: Color): boolean {
    return a.r === b.r && a.g === b.g && a.b === b.b;
  }
}
