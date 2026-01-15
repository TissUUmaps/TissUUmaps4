import { type Color } from "../model/types";

export class ColorUtils {
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

  static packColor(color: Color): number {
    return (color.r << 16) | (color.g << 8) | color.b;
  }

  static fromHex(hex: string): Color {
    if (!/^#([0-9A-Fa-f]{6})$/.test(hex)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }

  static toHex(color: Color): string {
    const rHex = color.r.toString(16).padStart(2, "0");
    const gHex = color.g.toString(16).padStart(2, "0");
    const bHex = color.b.toString(16).padStart(2, "0");
    return `#${rHex}${gHex}${bHex}`;
  }
}
