import type { Color } from "../model/primitives";
import { MathUtils } from "./MathUtils";

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
   * Packs an RGB color into a single 24-bit integer, `0xBBGGRR`
   *
   * The red component occupies the lowest byte, so that the integer, when
   * stored in host byte order on a little-endian host, matches the R, G, B byte
   * order of a canvas `ImageData` buffer.
   *
   * @param color - The color to pack
   * @returns The packed color, `0xBBGGRR`
   */
  static packColor(color: Color): number {
    // never exceeds 24 bits (0xFFFFFF), so no need for >>> 0
    return (color.b << 16) | (color.g << 8) | color.r;
  }

  /**
   * Folds a visibility and an opacity into the alpha channel of a packed color
   *
   * Combines the lower 24 bits of `color` (see {@link packColor}) with
   * `opacity` as alpha if `visibility` is non-zero, and with zero alpha
   * otherwise, into a packed 32-bit RGBA color, `0xAABBGGRR`.
   *
   * @param color - The packed color, `0xBBGGRR`; any higher bits are discarded
   * @param visibility - The visibility, larger than `0` for visible
   * @param opacity - The opacity, in the range [0, 255]
   * @returns The packed RGBA color, `0xAABBGGRR`, as an unsigned 32-bit integer
   */
  static packRGBA(color: number, visibility: number, opacity: number): number {
    const rgb = color & 0x00ffffff;
    if (visibility > 0) {
      return MathUtils.safeOr(rgb, MathUtils.safeLeftShift(opacity, 24));
    }
    return rgb;
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
