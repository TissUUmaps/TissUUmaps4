import { type Color } from "../model/types";

/** Utility methods for color parsing, packing, and conversion */
export class ColorUtils {
  /**
   * Parses a text-based color palette into an array of colors
   *
   * Each non-empty line is expected to contain three numeric components
   * separated by `sep`, scaled from `[0, maxValue]` to `[0, 255]`.
   *
   * @param str - Multi-line palette string
   * @param options - Parsing options
   * @param options.sep - Component separator (default `" "`)
   * @param options.maxValue - Maximum input value per component (default `1`)
   */
  static parseColorPalette(
    str: string,
    {
      sep = " ",
      maxValue = 1,
    }: {
      sep?: string;
      maxValue?: number;
    } = {},
  ): Color[] {
    return str
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line, i) => {
        const values = line.split(sep);
        if (values.length !== 3) {
          throw new Error(`Invalid color palette line ${i}: ${line}`);
        }
        return {
          r: (+values[0]! / maxValue) * 255,
          g: (+values[1]! / maxValue) * 255,
          b: (+values[2]! / maxValue) * 255,
        };
      });
  }

  /**
   * Packs an RGB color into a single 24-bit integer (`0xRRGGBB`)
   *
   * @param color - The color to pack
   */
  static packColor(color: Color): number {
    return (color.r << 16) | (color.g << 8) | color.b;
  }

  /**
   * Parses a hex color string into a {@link Color}
   *
   * @param hex - A `#RRGGBB` hex string
   * @throws If the string is not a valid 6-digit hex color
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
   */
  static toHex(color: Color): string {
    const rHex = Math.round(color.r).toString(16).padStart(2, "0");
    const gHex = Math.round(color.g).toString(16).padStart(2, "0");
    const bHex = Math.round(color.b).toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}`;
  }
}
