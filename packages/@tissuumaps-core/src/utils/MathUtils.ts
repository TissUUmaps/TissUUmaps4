/**
 * Utility methods for numeric clamping and alignment, and for bitwise
 * operations that yield unsigned 32-bit results
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
   * Performs a bitwise AND, returning an unsigned 32-bit result
   *
   * @param a - First operand
   * @param b - Second operand
   * @returns The result, as an unsigned 32-bit integer
   */
  static safeAnd(a: number, b: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return (a & b) >>> 0;
  }

  /**
   * Performs a bitwise OR, returning an unsigned 32-bit result
   *
   * @param a - First operand
   * @param b - Second operand
   * @returns The result, as an unsigned 32-bit integer
   */
  static safeOr(a: number, b: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return (a | b) >>> 0;
  }

  /**
   * Performs a bitwise XOR, returning an unsigned 32-bit result
   *
   * @param a - First operand
   * @param b - Second operand
   * @returns The result, as an unsigned 32-bit integer
   */
  static safeXor(a: number, b: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return (a ^ b) >>> 0;
  }

  /**
   * Performs a bitwise NOT, returning an unsigned 32-bit result
   *
   * @param a - The operand
   * @returns The result, as an unsigned 32-bit integer
   */
  static safeNot(a: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return ~a >>> 0;
  }

  /**
   * Performs a left shift, returning an unsigned 32-bit result
   *
   * @param value - The value to shift
   * @param shift - Number of bit positions to shift
   * @returns The result, as an unsigned 32-bit integer
   */
  static safeLeftShift(value: number, shift: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return (value << shift) >>> 0;
  }

  /**
   * Performs an unsigned right shift
   *
   * @param value - The value to shift
   * @param shift - Number of bit positions to shift
   * @returns The result, as an unsigned 32-bit integer
   */
  static safeRightShift(value: number, shift: number): number {
    return value >>> shift;
  }
}
