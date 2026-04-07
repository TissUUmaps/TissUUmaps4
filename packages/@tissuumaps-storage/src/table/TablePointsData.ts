import {
  type PointsData,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

export class TablePointsData implements PointsData {
  private readonly _tableData: TableData;
  private readonly _dimensionColumns?: string[];

  constructor(tableData: TableData, dimensionColumns?: string[]) {
    this._tableData = tableData;
    this._dimensionColumns = dimensionColumns;
  }

  getIds(): number[] {
    return this._tableData.getIds();
  }

  getSize(): number {
    return this._tableData.getSize();
  }

  getNames(): string[] | undefined {
    return this._tableData.getNames();
  }

  async suggestDimensionQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    if (this._dimensionColumns !== undefined) {
      return this._dimensionColumns.filter((column) =>
        column.includes(currentQuery),
      );
    }
    return await this._tableData.suggestColumnQueries(currentQuery, { signal });
  }

  async resolveDimensionQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._tableData.resolveColumnQuery(query, { signal });
  }

  async loadCoordinates(
    dimension: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<Float32Array> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const columnValues = await this._tableData.loadValues<number>(dimension, {
      signal,
    });
    signal?.throwIfAborted();
    return columnValues instanceof Float32Array
      ? columnValues
      : Float32Array.from(columnValues);
  }

  close(): void {}
}
