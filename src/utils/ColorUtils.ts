import { Color } from "../models/types";

export default class ColorUtils {
  static parseHex(hex: string): Color {
    const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
    if (cleanHex.length !== 6) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    const r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    const g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    const b = parseInt(cleanHex.slice(4, 6), 16) / 255;
    if (isNaN(r) || isNaN(g) || isNaN(b)) {
      throw new Error(`Invalid hex color: ${hex}`);
    }
    return { r, g, b };
  }

  static parseColormap(
    colormap: string,
    sep: string = " ",
    maxValue: number = 1.0,
  ): Color[] {
    return colormap
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line, i) => {
        const values = line.split(sep);
        if (values.length !== 3) {
          throw new Error(`Invalid colormap line ${i}: ${line}`);
        }
        const [rValue, gValue, bValue] = values.map((v) => +v);
        return {
          r: rValue! / maxValue,
          g: gValue! / maxValue,
          b: bValue! / maxValue,
        };
      });
  }
}
