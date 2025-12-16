export class MathUtils {
  static clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(min, value), max);
  }

  static safeAnd(a: number, b: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return (a & b) >>> 0;
  }

  static safeOr(a: number, b: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return (a | b) >>> 0;
  }

  static safeXor(a: number, b: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return (a ^ b) >>> 0;
  }

  static safeNot(a: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return ~a >>> 0;
  }

  static safeLeftShift(value: number, shift: number): number {
    // bitwise operators coerce operands to signed 32-bit integers,
    // so we need to use the unsigned right shift operator >>> 0
    // to convert large results back to unsigned 32-bit integers
    return (value << shift) >>> 0;
  }

  static safeRightShift(value: number, shift: number): number {
    return value >>> shift;
  }
}
