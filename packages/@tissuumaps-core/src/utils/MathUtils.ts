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
   *
   * If `multiple` is zero or `n` is already a multiple of `multiple`, returns `n`.
   * Otherwise, returns the smallest multiple of `multiple` that is greater than `n`.
   *
   * @param n - The number to align
   * @param multiple - The multiple to align to
   * @returns The aligned number
   */
  static align(n: number, multiple: number): number {
    if (multiple === 0) {
      return n;
    }
    if (n % multiple === 0) {
      return n;
    }
    return Math.ceil(n / multiple) * multiple;
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
