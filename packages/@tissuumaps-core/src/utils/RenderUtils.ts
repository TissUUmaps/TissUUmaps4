import type { Color } from "../model/primitives";
import type { NumericArray } from "../types/arrays";
import { ColorUtils } from "./ColorUtils";

/** Utility methods for rendering image channels */
export class RenderUtils {
  /**
   * Returns the value range that the type of the given array can hold, for use
   * as default contrast limits of image channel data
   *
   * Integer typed arrays span their full integer range, floating-point typed
   * arrays are taken to hold normalized values in `[0, 1]`, and plain arrays
   * are taken to hold 8-bit values.
   *
   * @param values - The array whose value range to return
   * @returns The value range, as `[min, max]`
   */
  static getDataTypeRange(values: NumericArray): [number, number] {
    if (values instanceof Uint8Array) {
      return [0, 255];
    }
    if (values instanceof Uint16Array) {
      return [0, 65535];
    }
    if (values instanceof Uint32Array) {
      return [0, 4294967295];
    }
    if (values instanceof Int8Array) {
      return [-128, 127];
    }
    if (values instanceof Int16Array) {
      return [-32768, 32767];
    }
    if (values instanceof Int32Array) {
      return [-2147483648, 2147483647];
    }
    if (Array.isArray(values)) {
      return [0, 255];
    }
    return [0, 1];
  }

  /**
   * Returns a default color for a channel, for use when no channel colors are
   * known
   *
   * The first six channels map to red, green, blue, yellow, cyan, and magenta.
   * Further channels are assigned hues 128 degrees apart, with saturation and
   * brightness decreasing by 0.05 every ten channels. Channel indices wrap
   * around after 100, so that saturation and brightness stay above 0.5.
   * Colors are not guaranteed to be unique.
   *
   * Resembles `ImageChannel.getDefaultChannelColor` in QuPath v0.7.0, except
   * that yellow, cyan, and magenta have been replaced by pure versions (255
   * for the two highest components, 0 for the lowest), and that QuPath wraps
   * after 360 channels instead, yielding dim colors and eventually black.
   *
   * @param c - The channel index, a non-negative integer
   * @returns The default color for the channel
   */
  static getDefaultChannelColor(c: number): Color {
    c = c % 100;
    switch (c) {
      case 0:
        return { r: 255, g: 0, b: 0 }; // red
      case 1:
        return { r: 0, g: 255, b: 0 }; // green
      case 2:
        return { r: 0, g: 0, b: 255 }; // blue
      case 3:
        return { r: 255, g: 255, b: 0 }; // yellow
      case 4:
        return { r: 0, g: 255, b: 255 }; // cyan
      case 5:
        return { r: 255, g: 0, b: 255 }; // magenta
      default: {
        const hue = ((c * 128) % 360) / 360;
        const level = 1 - Math.floor(c / 10) / 20;
        return ColorUtils.fromHSB(hue, level, level);
      }
    }
  }
}
