import {
  ArrayUtils,
  type BigIntArray,
  NumberUtils,
  type TypedArray,
  type TypedArrayOrArray,
} from "@tissuumaps/core";

/** Helpers for the column chunks a Parquet reader delivers */
export class ParquetColumnUtils {
  /**
   * Assembles the chunks of a column into the array the storage API holds
   *
   * A chunk is either a typed array, or a plain array with `null` for missing
   * values. Chunks of one numeric typed array type are concatenated as that
   * type; any other column of numbers and bigints becomes 64-bit floats, with
   * `NaN` for a missing value; all other columns are assembled as plain
   * arrays, with `null` for a missing value. Chunks are always copied.
   *
   * @param chunks - The chunks as the reader delivered them, each with the
   * index of its first row
   * @param numRows - The number of rows of the column
   * @returns The column values
   * @throws Error if a bigint is not a safe integer
   */
  static assembleColumn(
    chunks: { data: unknown[] | TypedArray | BigIntArray; rowStart: number }[],
    numRows: number,
  ): TypedArrayOrArray<unknown> {
    const arrayTypes = new Set(chunks.map(({ data }) => data.constructor));
    if (
      arrayTypes.size === 1 &&
      !arrayTypes.has(Array) &&
      !arrayTypes.has(BigInt64Array) &&
      !arrayTypes.has(BigUint64Array)
    ) {
      return ParquetColumnUtils._concat(
        chunks,
        chunks[0]!.data.constructor as new (length: number) => TypedArray,
        numRows,
      );
    }
    let numValues = 0;
    for (const { data } of chunks) {
      if (ArrayBuffer.isView(data)) {
        numValues += data.length;
        continue;
      }
      for (const v of data) {
        if (typeof v !== "number" && typeof v !== "bigint" && v !== null) {
          return ParquetColumnUtils._collect(chunks, numRows);
        }
        if (v !== null) {
          numValues++;
        }
      }
    }
    if (numValues === 0) {
      return ParquetColumnUtils._collect(chunks, numRows);
    }
    const values = new Float64Array(numRows).fill(NaN);
    for (const { data, rowStart } of chunks) {
      if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
        values.set(ArrayUtils.fromBigIntArray(data), rowStart);
      } else if (ArrayBuffer.isView(data)) {
        values.set(data, rowStart);
      } else {
        for (let i = 0; i < data.length; i++) {
          const v = data[i] as number | bigint | null;
          if (v !== null) {
            values[rowStart + i] =
              typeof v === "bigint" ? NumberUtils.parseSafeInt(v) : v;
          }
        }
      }
    }
    return values;
  }

  /**
   * Concatenates chunks into one typed array of the given type
   */
  private static _concat<TArray extends TypedArray>(
    chunks: { data: ArrayLike<unknown>; rowStart: number }[],
    arrayType: new (length: number) => TArray,
    numRows: number,
  ): TArray {
    const values = new arrayType(numRows);
    for (const { data, rowStart } of chunks) {
      values.set(data as never, rowStart);
    }
    return values;
  }

  /**
   * Collects chunks into one plain array
   */
  private static _collect(
    chunks: { data: ArrayLike<unknown>; rowStart: number }[],
    numRows: number,
  ): unknown[] {
    const values = new Array<unknown>(numRows).fill(null);
    for (const { data, rowStart } of chunks) {
      for (let i = 0; i < data.length; i++) {
        values[rowStart + i] = data[i];
      }
    }
    return values;
  }
}
