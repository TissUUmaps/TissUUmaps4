import {
  type GenericArray,
  ParseUtils,
  type ProgressCallback,
  type TableData,
  type TypedArray,
} from "@tissuumaps/core";

export class CSVTableData implements TableData {
  private readonly _n: number;
  private _ids: number[] | undefined;
  private readonly _names: string[] | undefined;
  private readonly _columns: string[];
  private readonly _columnValues: Map<string, string[] | TypedArray>;

  constructor(
    n: number,
    ids: number[] | undefined,
    names: string[] | undefined,
    columns: string[],
    columnValues: Map<string, string[] | TypedArray>,
  ) {
    this._n = n;
    this._ids = ids;
    this._names = names;
    this._columns = columns;
    this._columnValues = columnValues;
  }

  getIds(): number[] {
    if (this._ids === undefined) {
      console.warn("No ID column specified, assigning sequential IDs instead");
      this._ids = Array.from({ length: this.getSize() }, (_, i) => i);
    }
    return this._ids;
  }

  getSize(): number {
    return this._n;
  }

  getNames(): string[] | undefined {
    return this._names;
  }

  async suggestColumnQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const filteredColumns = this._columns.filter((column) =>
      column.includes(currentQuery),
    );
    return Promise.resolve(filteredColumns);
  }

  async resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const column = this._columns.includes(query) ? query : null;
    return Promise.resolve(column);
  }

  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const columnValues = this._columnValues.get(column);
    if (columnValues === undefined) {
      throw new Error(`Column ${column} does not exist in the table`);
    }
    return Promise.resolve(columnValues as GenericArray<T>);
  }

  async loadUniqueValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues(column, { signal, onProgress });
    signal?.throwIfAborted(); // bail out before the O(n) Set construction below
    const uniqueValues = Array.from(new Set(values));
    return uniqueValues as GenericArray<T>;
  }

  async loadValueRange(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<[number, number] | undefined> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues(column, { signal, onProgress });
    signal?.throwIfAborted(); // bail out before the O(n) min/max scan below
    if (typeof values[0] === "number") {
      let vmin, vmax;
      for (let i = 0; i < values.length; i++) {
        const v = ParseUtils.tryParseFinite(values[i]);
        if (v !== undefined) {
          if (vmin === undefined || v < vmin) {
            vmin = v;
          }
          if (vmax === undefined || v > vmax) {
            vmax = v;
          }
        }
      }
      if (vmin !== undefined && vmax !== undefined && vmin < vmax) {
        return [vmin, vmax];
      }
    }
    return undefined;
  }

  close(): void {}
}
