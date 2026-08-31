import type { Data } from "@tissuumaps/core";

/**
 * Base class for the data wrappers handed out by the data caches
 *
 * A wrapper delegates to the data it wraps, but takes its lifetime out of the
 * consumers' hands: `close` is a no-op, and only the cache destroys the wrapper
 * - and with it the wrapped data - once nothing references the data anymore.
 * Every access to the wrapped data after that throws.
 */
export abstract class DataWrapperBase<TData extends Data> implements Data {
  private readonly _data: TData;
  private _destroyed = false;

  constructor(data: TData) {
    this._data = data;
  }

  readonly close = () => {
    // state is managed by the cache, not by consumers
  };

  /**
   * Closes the wrapped data and marks the wrapper as destroyed
   */
  destroy(): void {
    this._destroyed = true;
    this._data.close();
  }

  protected get data(): TData {
    if (this._destroyed) {
      throw new Error("Data has been destroyed");
    }
    return this._data;
  }

  protected get destroyed(): boolean {
    return this._destroyed;
  }
}
