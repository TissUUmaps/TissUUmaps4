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
}
