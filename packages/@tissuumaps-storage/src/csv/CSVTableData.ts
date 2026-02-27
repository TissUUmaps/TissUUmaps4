import {
  type MappableArrayLike,
  type TableData,
  type TypedArray,
} from "@tissuumaps/core";

export async function loadCSVTableDataColumn<T>(
  column: string,
  columns: string[],
  data: (string[] | TypedArray)[],
  { signal }: { signal?: AbortSignal } = {},
): Promise<MappableArrayLike<T>> {
  signal?.throwIfAborted();
  const columnIndex = columns.indexOf(column);
  if (columnIndex === -1) {
    throw new Error(`Column "${column}" does not exist.`);
  }
  const columnData = await Promise.resolve(
    data[columnIndex]! as unknown as MappableArrayLike<T>,
  );
  signal?.throwIfAborted();
  return columnData;
}

export class CSVTableData implements TableData {
  private readonly _n: number;
  private readonly _columns: string[];
  private readonly _data: (string[] | TypedArray)[];
  private readonly _ranges: Map<string, [number, number]> = new Map();
  private _index?: number[];

  constructor(
    n: number,
    data: (string[] | TypedArray)[],
    columns: string[],
    index?: number[],
  ) {
    this._n = n;
    this._data = data;
    this._columns = columns;
    this._index = index;
  }

  getLength(): number {
    return this._n;
  }

  getIndex(): number[] {
    if (this._index === undefined) {
      console.warn("No ID column specified, using sequential IDs instead");
      this._index = Array.from({ length: this._n }, (_, i) => i);
    }
    return this._index;
  }

  async suggestColumnQueries(currentQuery: string): Promise<string[]> {
    const filteredColumns = this._columns.filter((column) =>
      column.includes(currentQuery),
    );
    return await Promise.resolve(filteredColumns);
  }

  async getColumn(query: string): Promise<string | null> {
    const column = this._columns.includes(query) ? query : null;
    return await Promise.resolve(column);
  }

  async loadColumn<T>(
    column: string,
    {
      signal,
      computeRange,
    }: { signal?: AbortSignal; computeRange?: boolean } = {},
  ): Promise<MappableArrayLike<T>> {
    signal?.throwIfAborted();
    const values = await loadCSVTableDataColumn<T>(
      column,
      this._columns,
      this._data,
      { signal },
    );
    signal?.throwIfAborted();
    if (computeRange && !this._ranges.has(column)) {
      let vmin, vmax;
      for (let i = 0; i < values.length; i++) {
        const v = values[i];
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
        this._ranges.set(column, [vmin, vmax]);
      }
    }
    return values;
  }

  getRange(column: string): [number, number] | undefined {
    return this._ranges.get(column);
  }

  destroy(): void {}
}
