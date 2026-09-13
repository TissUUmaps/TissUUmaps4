/** Utility methods for numeric clamping and alignment */
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
}
