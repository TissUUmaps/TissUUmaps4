/** Utility methods for bitwise operations that yield unsigned 32-bit results */
export class BitUtils {
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
