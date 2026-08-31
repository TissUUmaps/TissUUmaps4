import type {
  GenericArray,
  ProgressCallback,
  TableData,
} from "@tissuumaps/core";

import { SharedOperation } from "../SharedOperation";
import { DataWrapperBase } from "./DataWrapperBase";

/**
 * Cache wrapper around table data, sharing the loaded columns
 *
 * Values, unique values and value ranges are each loaded once per column and
 * then kept for as long as this wrapper lives; column queries are delegated to
 * the wrapped data unchanged.
 */
export class TableDataWrapper
  extends DataWrapperBase<TableData>
  implements TableData
{
  private readonly _loadValuesOps = new Map<
    string,
    SharedOperation<GenericArray<unknown>>
  >();
  private readonly _loadUniqueValuesOps = new Map<
    string,
    SharedOperation<GenericArray<unknown>>
  >();
  private readonly _loadValueRangeOps = new Map<
    string,
    SharedOperation<[number, number] | undefined>
  >();

  getIds(): number[] {
    return this.data.getIds();
  }

  getSize(): number {
    return this.data.getSize();
  }

  getNames(): string[] | undefined {
    return this.data.getNames();
  }

  suggestColumnQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    return this.data.suggestColumnQueries(currentQuery, options);
  }

  resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    return this.data.resolveColumnQuery(query, options);
  }

  /**
   * Loads a column's values, sharing one load operation per column between all
   * callers
   *
   * @param column - The name of the column to load the values of
   * @param options - Optional abort signal and progress callback
   * @returns A promise that resolves to the column's values, or rejects if the
   * wrapper has been destroyed
   */
  loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    if (this.destroyed) {
      return Promise.reject(new Error("Data has been destroyed"));
    }
    let op = this._loadValuesOps.get(column);
    if (op === undefined || op.failed) {
      const newOp = new SharedOperation((opts) =>
        this.data.loadValues(column, opts),
      );
      newOp.signal.addEventListener(
        "abort",
        () => {
          if (this._loadValuesOps.get(column) === newOp) {
            this._loadValuesOps.delete(column);
          }
        },
        { once: true },
      );
      this._loadValuesOps.set(column, newOp);
      op = newOp;
    }
    return op.subscribe(options) as Promise<GenericArray<T>>;
  }

  /**
   * Loads a column's unique values, sharing one load operation per column
   * between all callers
   *
   * @param column - The name of the column to load the unique values of
   * @param options - Optional abort signal and progress callback
   * @returns A promise that resolves to the column's unique values, or rejects
   * if the wrapper has been destroyed
   */
  loadUniqueValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    if (this.destroyed) {
      return Promise.reject(new Error("Data has been destroyed"));
    }
    let op = this._loadUniqueValuesOps.get(column);
    if (op === undefined || op.failed) {
      const newOp = new SharedOperation((opts) =>
        this.data.loadUniqueValues(column, opts),
      );
      newOp.signal.addEventListener(
        "abort",
        () => {
          if (this._loadUniqueValuesOps.get(column) === newOp) {
            this._loadUniqueValuesOps.delete(column);
          }
        },
        { once: true },
      );
      this._loadUniqueValuesOps.set(column, newOp);
      op = newOp;
    }
    return op.subscribe(options) as Promise<GenericArray<T>>;
  }

  /**
   * Loads the range of a column's numeric values, sharing one load operation
   * per column between all callers
   *
   * @param column - The name of the column to load the value range of
   * @param options - Optional abort signal and progress callback
   * @returns A promise that resolves to the column's minimum and maximum value,
   * to `undefined` if the column is not numeric, or rejects if the wrapper has
   * been destroyed
   */
  loadValueRange(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<[number, number] | undefined> {
    if (this.destroyed) {
      return Promise.reject(new Error("Data has been destroyed"));
    }
    let op = this._loadValueRangeOps.get(column);
    if (op === undefined || op.failed) {
      const newOp = new SharedOperation((opts) =>
        this.data.loadValueRange(column, opts),
      );
      newOp.signal.addEventListener(
        "abort",
        () => {
          if (this._loadValueRangeOps.get(column) === newOp) {
            this._loadValueRangeOps.delete(column);
          }
        },
        { once: true },
      );
      this._loadValueRangeOps.set(column, newOp);
      op = newOp;
    }
    return op.subscribe(options);
  }

  /**
   * Aborts all pending column load operations and destroys the wrapper
   */
  override destroy(): void {
    for (const op of [
      ...this._loadValuesOps.values(),
      ...this._loadUniqueValuesOps.values(),
      ...this._loadValueRangeOps.values(),
    ]) {
      op.abort();
    }
    super.destroy();
  }
}
