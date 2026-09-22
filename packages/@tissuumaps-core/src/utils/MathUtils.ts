import type { GenericArray, NumericArray } from "../types/arrays";
import { AsyncUtils } from "./AsyncUtils";
import { RandomUtils } from "./RandomUtils";

/**
 * Utility methods for numeric clamping, remapping, alignment, histograms and
 * counts
 */
export class MathUtils {
  /**
   * Clamps a value to the range `[min, max]`
   *
   * @param value - The value to clamp
   * @param min - Lower bound
   * @param max - Upper bound
   * @returns The clamped value
   */
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(min, value), max);
  }

  /**
   * Linearly maps a value from one range to another
   *
   * Values outside `from` are extrapolated, not clamped; clamp at the call
   * site where the domain is known. Swapping `from` and `to` yields the
   * inverse mapping.
   *
   * @param value - The value to map
   * @param from - The source range, as `[min, max]`, with `min !== max`
   * @param to - The target range, as `[min, max]`
   * @returns The mapped value
   * @throws Error if `from` is degenerate
   */
  static remap(
    value: number,
    from: [number, number],
    to: [number, number],
  ): number {
    const [fromMin, fromMax] = from;
    const [toMin, toMax] = to;
    if (fromMin === fromMax) {
      throw new Error("from must not be degenerate");
    }
    return toMin + ((value - fromMin) / (fromMax - fromMin)) * (toMax - toMin);
  }

  /**
   * Aligns a positive number `n` to the next multiple of `m`
   *
   * If `n` is already a multiple of `m`, returns `n`.
   * Otherwise, returns the smallest multiple of `m` that is greater than `n`.
   *
   * @param n - The non-negative number to align
   * @param m - The strictly positive multiple to align to
   * @returns The aligned number
   * @throws Error if `n` is negative, or if `m` is not strictly positive
   */
  static align(n: number, m: number): number {
    if (n < 0) {
      throw new Error("n must be non-negative");
    }
    if (m <= 0) {
      throw new Error("m must be strictly positive");
    }
    if (n % m === 0) {
      return n;
    }
    return Math.ceil(n / m) * m;
  }

  /**
   * Computes the range of numeric values, as their minimum and maximum
   *
   * Non-finite values (`NaN`, infinities) are ignored. If no finite value is
   * found (e.g. for empty arrays), the empty range `[Infinity, -Infinity]` is
   * returned; callers can detect it by checking that the lower bound exceeds
   * the upper bound.
   *
   * The values are traversed on the main thread, yielding to the event loop
   * periodically so the UI stays responsive for large arrays (see
   * {@link AsyncUtils.forEach}). Aborting the signal rejects with its reason.
   *
   * @param values - The values to compute the range of
   * @param options - Optional abort signal
   * @returns A promise that resolves to the range, as `[min, max]`
   */
  static async computeRange(
    values: NumericArray,
    options?: { signal?: AbortSignal },
  ): Promise<[number, number]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let vmin = Infinity;
    let vmax = -Infinity;
    await AsyncUtils.forEach(
      values,
      (v) => {
        if (Number.isFinite(v)) {
          if (v < vmin) {
            vmin = v;
          }
          if (v > vmax) {
            vmax = v;
          }
        }
      },
      { signal },
    );
    return [vmin, vmax];
  }

  /**
   * Computes the histogram of numeric values over a given value range
   *
   * `hist[i]` counts the values that are closest to bin `i`, with bins spread
   * evenly over `range`: bin `0` maps to the range's lower bound, the last bin
   * to its upper bound, and each bin in between to `vmin + i / (bins - 1) *
   * (vmax - vmin)`. Values outside the range are counted in the nearest edge
   * bin, non-finite values (`NaN`, infinities) are ignored. If the range is
   * degenerate (upper bound not above lower bound), or if `bins` is `1`, all
   * values fall into bin `0`.
   *
   * If `sample` is positive and smaller than the number of values, the
   * histogram is estimated from `sample` values drawn uniformly with
   * replacement, using the seeded generator of
   * {@link RandomUtils.createUint32RNG}; the counts then sum to `sample`
   * (minus ignored non-finite values) rather than to the number of values.
   * Sampling is deterministic for a given `seed`. Otherwise, every value is
   * counted exactly once.
   *
   * The values are traversed on the main thread, yielding to the event loop
   * periodically so the UI stays responsive for large arrays (see
   * {@link AsyncUtils.forEach}). Aborting the signal rejects with its reason.
   *
   * @param values - The values to compute the histogram of
   * @param range - The value range the bins span, as `[min, max]`
   * @param options - Optional abort signal (`signal`), number of bins
   *   (`bins`, a positive integer, defaults to `1024`), number of values to
   *   sample (`sample`; omitting it, `0`, or at least the number of values
   *   disables sampling), and seed for sampling (`seed`, defaults to `0`)
   * @returns A promise that resolves to the histogram, as bin counts and the
   * given value range
   */
  static async computeHistogram(
    values: NumericArray,
    range: [number, number],
    options?: {
      signal?: AbortSignal;
      bins?: number;
      sample?: number;
      seed?: number;
    },
  ): Promise<{ hist: number[]; range: [number, number] }> {
    const { signal, bins = 1024, sample, seed = 0 } = options ?? {};
    signal?.throwIfAborted();
    const [vmin, vmax] = range;
    const hist = new Array<number>(bins).fill(0);
    const scale = vmin < vmax ? (bins - 1) / (vmax - vmin) : 0;
    const rng =
      sample !== undefined && sample > 0 && sample < values.length
        ? RandomUtils.createUint32RNG(seed)
        : undefined;
    await AsyncUtils.forEach(
      { length: Math.min(sample || values.length, values.length) },
      (_, i) => {
        const v = values[rng ? rng() % values.length : i]!;
        if (Number.isFinite(v)) {
          const bin = MathUtils.clamp(
            Math.round((v - vmin) * scale),
            0,
            bins - 1,
          );
          hist[bin]! += 1;
        }
      },
      { signal },
    );
    return { hist, range };
  }

  /**
   * Counts the number of occurrences of every distinct value
   *
   * The counts are keyed by value, in the order the values first occur.
   * Distinctness follows `Map` key equality, i.e. `NaN` counts as one value
   * and `0` and `-0` as the same one.
   *
   * The values are traversed on the main thread, yielding to the event loop
   * periodically so the UI stays responsive for large arrays (see
   * {@link AsyncUtils.forEach}). Aborting the signal rejects with its reason.
   *
   * @typeParam T - Element type of the values
   * @param values - The values to count
   * @param options - Optional abort signal
   * @returns A promise that resolves to the count of every distinct value
   */
  static async computeUniqueValueCounts<T>(
    values: GenericArray<T>,
    options?: { signal?: AbortSignal },
  ): Promise<Map<T, number>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const counts = new Map<T, number>();
    await AsyncUtils.forEach(
      values as ArrayLike<T>,
      (v) => {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      },
      { signal },
    );
    return counts;
  }
}
