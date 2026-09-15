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
   * first bin at which the cumulative count from the bottom reaches the
   * fraction `qlow` of the total count, the upper limit is the value of the
   * first bin at which the cumulative count from the top reaches the fraction
   * `1 - qhigh`; i.e., the fraction `qlow` of the values is clipped at the
   * bottom and the fraction `1 - qhigh` at the top. Only non-empty bins are
   * considered, so quantiles of `0` and `1` yield the first and last non-empty
   * bin, respectively. Values that fall into the same bin cannot be told
   * apart, so the limits are only as precise as the bins.
   *
   * Histograms with fewer than two bins, histograms whose counts sum to zero
   * and degenerate ranges return `range` as is. So do histograms whose clipped
   * limits would not be ascending (upper bin at or below lower bin), which
   * happens if more than `qhigh - qlow` of the values fall into a single bin,
   * e.g. for sparse channels that are mostly background, or if `qhigh` is
   * below `qlow`, and a `qlow` above `1`, which no bin can reach.
   *
   * @param histogram - The channel histogram, as bin counts and value range
   * @param qlow - The quantile of the lower limit, in `[0, 1]`
   * @param qhigh - The quantile of the upper limit, in `[0, 1]`, above `qlow`
   * @returns The contrast limits, as `[low, high]` in the histogram's value
   * range, with `low < high` unless the range is degenerate
   */
  static getDefaultContrastLimits(
    histogram: { hist: number[]; range: [number, number] },
    qlow: number = 0.01,
    qhigh: number = 0.999,
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
    let binLeft: number | undefined;
    let binRight: number | undefined;
    let cumulativeLeft = 0;
    let cumulativeRight = 0;
    const targetLeft = total * qlow;
    const targetRight = total - total * qhigh; // avoid potential rounding errors of total * (1 - qhigh)
    for (let i = 0; i < n; i++) {
      const countLeft = hist[i]!;
      if (countLeft > 0) {
        cumulativeLeft += countLeft;
        if (binLeft === undefined && cumulativeLeft >= targetLeft) {
          binLeft = i;
        }
      }
      const countRight = hist[n - 1 - i]!;
      if (countRight > 0) {
        cumulativeRight += countRight;
        if (binRight === undefined && cumulativeRight >= targetRight) {
          binRight = n - 1 - i;
        }
      }
      if (binLeft !== undefined && binRight !== undefined) {
        break;
      }
    }
    if (
      binLeft === undefined ||
      binRight === undefined ||
      binLeft >= binRight
    ) {
      return [vmin, vmax];
    }
    return [
      vmin + (binLeft / (n - 1)) * (vmax - vmin),
      vmin + (binRight / (n - 1)) * (vmax - vmin),
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
