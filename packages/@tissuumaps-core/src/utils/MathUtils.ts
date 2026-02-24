/**
 * Utility methods for safe 32-bit unsigned integer arithmetic
 * and numeric clamping
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
   * Aligns a number `n` to the next multiple of `multiple`
   * (i.e., returns the smallest multiple of `multiple` that is >= `n`)
   *
   * @param n - The number to align
   * @param multiple - The multiple to align to
   * @returns The aligned number
   */
  static align(n: number, multiple: number): number {
    const remainder = n % multiple;
    if (remainder === 0) {
      return n;
    }
    return n + multiple - remainder;
  }

  /**
   * Returns the minimum and maximum values in an array-like object
   * (ignoring non-numeric or non-finite values)
   *
   * @param values - The array-like object to process
   * @returns The [min, max] range, or undefined if no valid values are found
   */
  static getRange(values: ArrayLike<unknown>): [number, number] | undefined {
    let vmin, vmax;
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      if (typeof v === "number" && Number.isFinite(v)) {
        if (vmin === undefined || v < vmin) {
          vmin = v;
        }
        if (vmax === undefined || v > vmax) {
          vmax = v;
        }
      }
    }
    if (vmin !== undefined && vmax !== undefined) {
      return [vmin, vmax];
    }
    return undefined;
  }

  /**
   * Performs a bitwise AND, returning an unsigned 32-bit result
   *
   * @param a - First operand
   * @param b - Second operand
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
   */
  static safeRightShift(value: number, shift: number): number {
    return value >>> shift;
  }
}
