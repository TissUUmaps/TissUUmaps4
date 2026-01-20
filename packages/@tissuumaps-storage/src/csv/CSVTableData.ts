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

  suggestColumnQueries(currentQuery: string): string[] {
    return this._columns.filter((column) => column.includes(currentQuery));
  }

  getColumn(query: string): string | null {
    return this._columns.includes(query) ? query : null;
  }

  getColumns(searchValue: string): string[] {
    searchValue = searchValue.toLowerCase();
    return this._columns.filter((columns) =>
      columns.toLowerCase().includes(searchValue),
    );
  }

  async loadColumn<T>(
    column: string,
    options: { signal?: AbortSignal } = {},
  ): Promise<MappableArrayLike<T>> {
    return await loadCSVTableDataColumn(
      column,
      this._columns,
      this._data,
      options,
    );
  }

  destroy(): void {}
}
