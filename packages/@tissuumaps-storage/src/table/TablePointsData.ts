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

  suggestDimensionSearchValues(currentDimensionSearchValue: string): string[] {
    return this._tableData.suggestColumnSearchValues(
      currentDimensionSearchValue,
    );
  }

  getDimensions(searchValue: string): string[] {
    if (this._dimensionColumns !== undefined) {
      searchValue = searchValue.toLowerCase();
      return this._dimensionColumns.filter((columns) =>
        columns.toLowerCase().includes(searchValue),
      );
    }
    return this._tableData.getColumns(searchValue);
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
