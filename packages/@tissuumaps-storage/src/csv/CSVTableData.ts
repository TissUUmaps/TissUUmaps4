import {
  type GenericArray,
  MathUtils,
  type NumericArray,
  type TableColumnQuerySuggestion,
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

  suggestColumnQueries(
    currentQuery: string,
  ): Promise<TableColumnQuerySuggestion[]> {
    const lowerCaseQuery = currentQuery.toLowerCase();
    const exactMatches: string[] = [];
    const prefixMatches: string[] = [];
    const matches: string[] = [];
    const others: string[] = [];
    for (const column of this._columns) {
      const lowerCaseColumn = column.toLowerCase();
      if (column === currentQuery) {
        exactMatches.push(column);
      } else if (lowerCaseColumn.startsWith(lowerCaseQuery)) {
        prefixMatches.push(column);
      } else if (lowerCaseColumn.includes(lowerCaseQuery)) {
        matches.push(column);
      } else {
        others.push(column);
      }
    }
    return Promise.resolve([
      ...[...exactMatches, ...prefixMatches, ...matches].map((query) => ({
        query,
      })),
      ...others.map((query) => ({ query, fallback: true })),
    ]);
  }

  resolveColumnQuery(query: string): Promise<string | null> {
    if (this._columns.includes(query)) {
      return Promise.resolve(query);
    }
    const lowerCaseQuery = query.toLowerCase();
    const matches = this._columns.filter(
      (column) => column.toLowerCase() === lowerCaseQuery,
    );
    return Promise.resolve(matches.length === 1 ? matches[0]! : null);
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

  async loadUniqueValueCounts<T>(
    column: string,
    options?: { signal?: AbortSignal },
  ): Promise<Map<T, number>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const values = await this.loadValues<T>(column);
    signal?.throwIfAborted(); // loadValues() does not throw on abort
    return await MathUtils.computeUniqueValueCounts(values, { signal });
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
      const [vmin, vmax] = await MathUtils.computeRange(
        values as NumericArray,
        { signal },
      );
      if (vmin < vmax) {
        return [vmin, vmax];
      }
    }
    return undefined;
  }

  close(): void {}
}
