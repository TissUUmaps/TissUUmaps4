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

  suggestDimensionQueries(currentQuery: string): string[] {
    if (this._dimensionColumns !== undefined) {
      return this._dimensionColumns.filter((column) =>
        column.includes(currentQuery),
      );
    }
    return this._tableData.suggestColumnQueries(currentQuery);
  }

  getDimension(query: string): string | null {
    return this._tableData.getColumn(query);
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
