import type { NumericArray } from "../types/arrays";
import { AsyncUtils } from "./AsyncUtils";
import { RandomUtils } from "./RandomUtils";

/** Utility methods for numeric clamping, alignment and histograms */
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
   * @param bins - The number of bins, a positive integer
   * @param options - Optional abort signal (`signal`), number of values to
   *   sample (`sample`; omitting it, `0`, or at least the number of values
   *   disables sampling), and seed for sampling (`seed`, defaults to `0`)
   * @returns A promise that resolves to the histogram, as bin counts and the
   * given value range
   */
  static async computeHistogram(
    values: NumericArray,
    range: [number, number],
    bins: number = 1024,
    options?: { signal?: AbortSignal; sample?: number; seed?: number },
  ): Promise<{ hist: number[]; range: [number, number] }> {
    const { signal, sample, seed = 0 } = options ?? {};
    signal?.throwIfAborted();
    const [vmin, vmax] = range;
    const hist = new Array<number>(bins).fill(0);
    const scale = vmin < vmax ? (bins - 1) / (vmax - vmin) : 0;
    const rng =
      sample && sample < values.length
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
}
