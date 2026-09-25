import {
  ArrayUtils,
  type BigIntArray,
  NumberUtils,
  type TypedArray,
  type TypedArrayOrArray,
} from "@tissuumaps/core";

/**
 * Assembles the chunks of a Parquet column into the array the storage API
 * holds, one chunk at a time
 *
 * A chunk is a typed array, or a plain array with `null` for missing values,
 * and is copied into one array built in place: chunks of one numeric typed
 * array type fill an array of that type, and the first chunk that does not fit
 * (plain, bigint or of another type) turns the column into 64-bit floats, with
 * `NaN` for missing values; columns holding anything but numbers are collected
 * into plain arrays. Chunks may arrive in any order, as the reader emits row
 * groups as they resolve. Rows no chunk covers stay `NaN`, `null` or `0`,
 * depending on the array.
 */
export class ParquetColumnBuilder {
  private readonly _numRows: number;
  private _values: TypedArray | unknown[] | undefined;
  private _numWritten = 0;
  // whether every value so far is a number, a bigint or null
  private _numeric = true;

  /**
   * @param numRows - The number of rows of the column
   */
  constructor(numRows: number) {
    this._numRows = numRows;
  }

  /**
   * Adds a chunk
   *
   * @param data - The chunk, as the reader delivered it
   * @param rowStart - The index of the chunk's first row
   * @throws Error if a bigint is not a safe integer
   */
  addChunk(data: unknown[] | TypedArray | BigIntArray, rowStart: number): void {
    if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
      this._addNumbers(ArrayUtils.fromBigIntArray(data), rowStart);
    } else if (ArrayBuffer.isView(data)) {
      this._addNumbers(data, rowStart);
    } else {
      this._addValues(data, rowStart);
    }
    this._numWritten = Math.max(this._numWritten, rowStart + data.length);
  }

  /**
   * Builds the column
   *
   * @returns The column values
   */
  build(): TypedArrayOrArray<unknown> {
    return this._values ?? new Array<unknown>(this._numRows).fill(null);
  }

  /**
   * Writes a typed chunk, into an array of its type until another type shows up
   */
  private _addNumbers(data: TypedArray, rowStart: number): void {
    if (this._values === undefined) {
      this._values = new (data.constructor as new (n: number) => TypedArray)(
        this._numRows,
      );
      if (this._values instanceof Float64Array) {
        this._values.fill(NaN);
      }
    }
    if (Array.isArray(this._values)) {
      if (!this._numeric) {
        this._collect(data, rowStart);
        return;
      }
      this._values = this._toFloat64Array();
    } else if (
      this._values.constructor !== data.constructor &&
      !(this._values instanceof Float64Array)
    ) {
      this._values = this._toFloat64Array();
    }
    this._values.set(data, rowStart);
  }

  /**
   * Writes a plain chunk, as 64-bit floats while the column holds numbers only
   */
  private _addValues(data: unknown[], rowStart: number): void {
    let numValues = 0;
    for (const v of data) {
      if (typeof v === "number" || typeof v === "bigint") {
        numValues++;
      } else if (v !== null) {
        this._numeric = false;
        break;
      }
    }
    if (this._numeric && (numValues > 0 || ArrayBuffer.isView(this._values))) {
      if (!(this._values instanceof Float64Array)) {
        this._values = this._toFloat64Array();
      }
      for (let i = 0; i < data.length; i++) {
        const v = data[i] as number | bigint | null;
        this._values[rowStart + i] =
          v === null
            ? NaN
            : typeof v === "bigint"
              ? NumberUtils.parseSafeInt(v)
              : v;
      }
      return;
    }
    this._collect(data, rowStart);
  }

  /**
   * Writes a chunk into a plain array, demoting the values built so far first
   */
  private _collect(data: ArrayLike<unknown>, rowStart: number): void {
    if (!Array.isArray(this._values)) {
      const values = new Array<unknown>(this._numRows).fill(null);
      for (let i = 0; i < this._numWritten; i++) {
        values[i] = this._values?.[i];
      }
      this._values = values;
    }
    for (let i = 0; i < data.length; i++) {
      this._values[rowStart + i] = data[i];
    }
  }

  /**
   * Copies the values built so far into 64-bit floats; a plain array holds
   * nulls only at this point, which become `NaN`
   */
  private _toFloat64Array(): Float64Array {
    const values = new Float64Array(this._numRows).fill(NaN);
    if (this._values !== undefined && !Array.isArray(this._values)) {
      values.set(this._values.subarray(0, this._numWritten));
    }
    return values;
  }
}
