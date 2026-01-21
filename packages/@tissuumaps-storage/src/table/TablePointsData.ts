import { type PointsData, type TableData } from "@tissuumaps/core";

export class TablePointsData implements PointsData {
  private readonly _tableData: TableData;
  private readonly _dimensionColumns?: string[];

  constructor(tableData: TableData, dimensionColumns?: string[]) {
    this._tableData = tableData;
    this._dimensionColumns = dimensionColumns;
  }

  getLength(): number {
    return this._tableData.getLength();
  }

  getIndex(): number[] {
    return this._tableData.getIndex();
  }

  async suggestDimensionQueries(currentQuery: string): Promise<string[]> {
    if (this._dimensionColumns !== undefined) {
      const filteredColumns = this._dimensionColumns.filter((column) =>
        column.includes(currentQuery),
      );
      return await Promise.resolve(filteredColumns);
    }
    return await this._tableData.suggestColumnQueries(currentQuery);
  }

  async getDimension(query: string): Promise<string | null> {
    return await this._tableData.getColumn(query);
  }

  async loadCoordinates(
    dimension: string,
    { signal }: { signal?: AbortSignal } = {},
  ): Promise<Float32Array> {
    signal?.throwIfAborted();
    const coords = await this._tableData.loadColumn<number>(dimension, {
      signal,
    });
    signal?.throwIfAborted();
    return coords instanceof Float32Array ? coords : Float32Array.from(coords);
  }

  destroy(): void {}
}
