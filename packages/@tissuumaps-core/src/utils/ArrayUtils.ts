import type { BigIntArray, IDArray, IntOrUintArray } from "../types/arrays";
import { NumberUtils } from "./NumberUtils";

/**
 * Utility methods for converting arrays to the types the storage API holds
 *
 * Data providers never expose 64-bit integers (see `TypedArrayOrArray`), and
 * hold item IDs as an `IDArray`. These methods convert what a file format
 * delivers to those types, throwing if a value cannot be represented.
 */
export class ArrayUtils {
  /**
   * Converts 64-bit integers to 64-bit floats (see
   * {@link NumberUtils.parseSafeInt})
   *
   * @param values - The values to convert
   * @returns The values as 64-bit floats
   * @throws Error if a value is not a safe integer
   */
  static fromBigIntArray(values: BigIntArray): Float64Array {
    return Float64Array.from(values, (v) => NumberUtils.parseSafeInt(v));
  }

  /**
   * Converts item IDs to an `IDArray`
   *
   * Integer typed arrays, string arrays and 64-bit float arrays holding safe
   * integers are returned as they are; 64-bit integer typed arrays are
   * converted with {@link fromBigIntArray}. Any other array has to hold either
   * strings only, which are copied into a string array, or safe integers only
   * (numbers or bigints), which are copied into 64-bit floats. Numeric strings
   * are not parsed: whether `"12"` is an ID or a number is up to the data
   * provider. An empty array yields an empty unsigned 32-bit integer array.
   *
   * @param values - The IDs to convert
   * @returns The IDs as an integer typed array, a 64-bit float array or a
   * string array
   * @throws Error if a value is neither a string nor a safe integer, or if
   * strings and integers are mixed
   */
  static toIDArray(values: ArrayLike<unknown>): IDArray {
    if (ArrayUtils._isIntOrUintArray(values)) {
      return values;
    }
    if (values instanceof BigInt64Array || values instanceof BigUint64Array) {
      return ArrayUtils.fromBigIntArray(values);
    }
    if (values.length === 0) {
      return new Uint32Array(0);
    }
    if (typeof values[0] === "string") {
      const ids = Array.isArray(values) ? values : Array.from(values);
      for (const id of ids) {
        if (typeof id !== "string") {
          throw new Error(`ID is not a string: ${String(id)}`);
        }
      }
      return ids as string[];
    }
    const ids =
      values instanceof Float64Array ? values : new Float64Array(values.length);
    for (let i = 0; i < values.length; i++) {
      const v = values[i];
      const id = typeof v === "bigint" ? Number(v) : v;
      if (typeof id !== "number" || !Number.isSafeInteger(id)) {
        throw new Error(`ID is not a safe integer: ${String(v)}`);
      }
      ids[i] = id;
    }
    return ids;
  }

  /**
   * Tells whether an array is an integer typed array of at most 32 bits
   */
  private static _isIntOrUintArray(
    values: ArrayLike<unknown>,
  ): values is IntOrUintArray {
    return (
      values instanceof Int8Array ||
      values instanceof Int16Array ||
      values instanceof Int32Array ||
      values instanceof Uint8Array ||
      values instanceof Uint8ClampedArray ||
      values instanceof Uint16Array ||
      values instanceof Uint32Array
    );
  }
}
