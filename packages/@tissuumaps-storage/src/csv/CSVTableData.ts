import {
  type MappableArrayLike,
  type TableData,
  type TypedArray,
} from "@tissuumaps/core";

export class CSVTableData implements TableData {
  private readonly _length: number;
  private readonly _columns: string[];
  private readonly _columnData: (string[] | TypedArray)[];

  constructor(
    length: number,
    columns: string[],
    columnData: (string[] | TypedArray)[],
  ) {
    this._length = length;
    this._columns = columns;
    this._columnData = columnData;
  }

  getLength(): number {
    return this._length;
  }

  getColumns(): string[] {
    return this._columns;
  }

  async loadColumn<T>(
    column: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<MappableArrayLike<T>> {
    signal?.throwIfAborted();
    if (!this._columns.includes(column)) {
      throw new Error(`Column "${column}" does not exist.`);
    }
    const columnIndex = this._columns.indexOf(column);
    const columnData = await Promise.resolve(
      this._columnData[columnIndex]! as unknown as MappableArrayLike<T>,
    );
    signal?.throwIfAborted();
    return columnData;
  }

  destroy(): void {}
}
