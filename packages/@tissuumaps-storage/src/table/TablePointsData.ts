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

  getDimensions(): string[] {
    return this._dimensionColumns ?? this._tableData.getColumns();
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
