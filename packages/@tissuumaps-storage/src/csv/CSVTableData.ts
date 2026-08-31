import {
  type GenericArray,
  ParseUtils,
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

  suggestColumnQueries(currentQuery: string): Promise<string[]> {
    const filteredColumns = this._columns.filter((column) =>
      column.includes(currentQuery),
    );
    return Promise.resolve(filteredColumns);
  }

  resolveColumnQuery(query: string): Promise<string | null> {
    const column = this._columns.includes(query) ? query : null;
    return Promise.resolve(column);
  }

  loadValues<T>(column: string): Promise<GenericArray<T>> {
    const columnValues = this._columnValues.get(column);
    if (columnValues === undefined) {
      return Promise.reject(
        new Error(`Column ${column} does not exist in the table`),
      );
    }
    return Promise.resolve(columnValues as GenericArray<T>);
  }

  async loadUniqueValues<T>(
    column: string,
    options?: { signal?: AbortSignal },
  ): Promise<GenericArray<T>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues(column);
    signal?.throwIfAborted(); // loadValues() does not throw on abort
    const uniqueValues = Array.from(new Set(values));
    return uniqueValues as GenericArray<T>;
  }

  async loadValueRange(
    column: string,
    options?: { signal?: AbortSignal },
  ): Promise<[number, number] | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues(column);
    signal?.throwIfAborted(); // loadValues() does not throw on abort
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
