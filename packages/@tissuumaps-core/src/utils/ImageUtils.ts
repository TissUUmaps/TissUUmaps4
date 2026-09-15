import type { Color } from "../model/primitives";
import type { NumericArray } from "../types/arrays";
import { ColorUtils } from "./ColorUtils";

/** Utility methods for image channel defaults */
export class ImageUtils {
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

  /**
   * Returns quantile-based contrast limits derived from a channel histogram,
   * for use as default contrast limits when no contrast limits are known
   *
   * The histogram's `hist[i]` counts the values that fall into bin `i`, with
   * bins spread evenly over `range`: bin `0` maps to the range's lower bound,
   * the last bin to its upper bound, and each bin in between to
   * `vmin + i / (n - 1) * (vmax - vmin)` (see
   * {@link MathUtils.computeHistogram}). The lower limit is the value of the
   * first bin at which the cumulative count (from the bottom) reaches the
   * given quantile of the total count, the upper limit is the value of the
   * first bin at which the cumulative count from the top does; i.e., the
   * quantile is clipped at each end. Values that fall into the same bin
   * cannot be told apart, so the limits are only as precise as the bins.
   *
   * Histograms with fewer than two bins, histograms whose counts sum to zero
   * and degenerate ranges return `range` as is. Note that the limits collapse
   * (upper equals lower) if more than `1 - quantile` of the values fall into a
   * single bin, e.g. for sparse channels that are mostly background.
   *
   * @param histogram - The channel histogram, as bin counts and value range
   * @param quantile - The fraction of values to clip at each end, in
   * `[0, 0.5]`; larger fractions yield non-ascending limits
   * @returns The contrast limits, as `[low, high]` in the histogram's value
   * range
   */
  static getDefaultContrastLimits(
    histogram: { hist: number[]; range: [number, number] },
    quantile: number = 0.01,
  ): [number, number] {
    const {
      hist,
      range: [vmin, vmax],
    } = histogram;
    const n = hist.length;
    if (n < 2 || vmin === vmax) {
      return [vmin, vmax];
    }
    const total = hist.reduce((sum, count) => sum + count, 0);
    if (total === 0) {
      return [vmin, vmax];
    }
    const target = total * quantile;
    let binLow: number | undefined;
    let binHigh: number | undefined;
    let cumulativeLow = 0;
    let cumulativeHigh = 0;
    for (let i = 0; i < n; i++) {
      cumulativeLow += hist[i]!;
      if (binLow === undefined && cumulativeLow >= target) {
        binLow = i;
      }
      cumulativeHigh += hist[n - 1 - i]!;
      if (binHigh === undefined && cumulativeHigh >= target) {
        binHigh = n - 1 - i;
      }
      if (binLow !== undefined && binHigh !== undefined) {
        break;
      }
    }
    return [
      vmin + (binLow! / (n - 1)) * (vmax - vmin),
      vmin + (binHigh! / (n - 1)) * (vmax - vmin),
    ];
  }

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
}
