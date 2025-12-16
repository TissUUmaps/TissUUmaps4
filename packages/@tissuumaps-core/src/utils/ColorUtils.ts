import { type Color } from "../types";

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

  static parseColor(colorStr: string): Color {
    if (colorStr.startsWith("#") && colorStr.length === 7) {
      const r = parseInt(colorStr.slice(1, 3), 16);
      const g = parseInt(colorStr.slice(3, 5), 16);
      const b = parseInt(colorStr.slice(5, 7), 16);
      return { r, g, b };
    }
    if (colorStr.startsWith("rgb(") && colorStr.endsWith(")")) {
      const parts = colorStr.slice(4, -1).split(",");
      if (parts.length === 3) {
        const r = parseInt(parts[0]!, 10);
        const g = parseInt(parts[1]!, 10);
        const b = parseInt(parts[2]!, 10);
        return { r, g, b };
      }
    }
    throw new Error(`Invalid color string: ${colorStr}`);
  }

  static packColor(color: Color): number {
    return (color.r << 16) | (color.g << 8) | color.b;
  }
}
