import {
  type PointsData,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";

export class TablePointsData implements PointsData {
  private readonly _tableData: TableData;
  private readonly _xColumn: string;
  private readonly _yColumn: string;

  constructor(tableData: TableData, xColumn: string, yColumn: string) {
    this._tableData = tableData;
    this._xColumn = xColumn;
    this._yColumn = yColumn;
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

  async loadCoordinates(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<[Float32Array, Float32Array]> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const xPromise = this._tableData.loadValues<number>(this._xColumn, {
      signal,
      onProgress,
    });
    const yPromise = this._tableData.loadValues<number>(this._yColumn, {
      signal,
      onProgress,
    });
    let [xData, yData] = await Promise.all([xPromise, yPromise]);
    signal?.throwIfAborted();
    if (!(xData instanceof Float32Array)) {
      xData = Float32Array.from(xData);
    }
    if (!(yData instanceof Float32Array)) {
      yData = Float32Array.from(yData);
    }
    return [xData, yData];
  }

  close(): void {}
}
