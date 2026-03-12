import {
  type MappableArrayLike,
  type TableData,
  type TypedArray,
} from "@tissuumaps/core";

export class CSVTableData implements TableData {
  private readonly _n: number;
  private readonly _columns: string[];
  private readonly _columnValues: Map<string, string[] | TypedArray>;
  private readonly _columnValueRanges: Map<string, [number, number]>;
  private _ids?: number[];

  constructor(
    n: number,
    columns: string[],
    columnValues: Map<string, string[] | TypedArray>,
    ids?: number[],
  ) {
    this._n = n;
    this._columns = columns;
    this._columnValues = columnValues;
    this._columnValueRanges = new Map();
    this._ids = ids;
  }

  getIds(): number[] {
    if (this._ids === undefined) {
      console.warn("No ID column specified, using sequential IDs instead");
      this._ids = Array.from({ length: this._n }, (_, i) => i);
    }
    return this._ids;
  }

  getSize(): number {
    return this._n;
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
    return await Promise.resolve(filteredColumns);
  }

  async resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const column = this._columns.includes(query) ? query : null;
    return await Promise.resolve(column);
  }

  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal },
  ): Promise<MappableArrayLike<T>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const columnValues = this._columnValues.get(column) as unknown as
      | MappableArrayLike<T>
      | undefined;
    if (columnValues === undefined) {
      throw new Error(`Column ${column} does not exist in the table`);
    }
    return await Promise.resolve(columnValues);
  }

  async loadValueRange(
    column: string,
    options?: { signal?: AbortSignal },
  ): Promise<[number, number] | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    let valueRange = this._columnValueRanges.get(column);
    if (valueRange !== undefined) {
      return valueRange;
    }
    const columnValues = await this.loadValues(column, { signal });
    signal?.throwIfAborted();
    if (typeof columnValues[0] === "number") {
      let vmin, vmax;
      for (let i = 0; i < columnValues.length; i++) {
        const v = columnValues[i];
        if (typeof v === "number" && Number.isFinite(v)) {
          if (vmin === undefined || v < vmin) {
            vmin = v;
          }
          if (vmax === undefined || v > vmax) {
            vmax = v;
          }
        }
      }
      if (vmin !== undefined && vmax !== undefined && vmin < vmax) {
        valueRange = [vmin, vmax];
        this._columnValueRanges.set(column, valueRange);
      }
    }
    return await Promise.resolve(valueRange);
  }

  destroy(): void {}
}
