import { useCallback } from "react";

import type {
  PointsData,
  PointsGeometry,
  ProgressCallback,
} from "@tissuumaps/core";
import type { ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "..";

export class LoadedPointsDataAdapter implements PointsData {
  private readonly _pointsId: string;

  constructor(pointsId: string) {
    this._pointsId = pointsId;
  }

  getIds(): number[] {
    return this._getData().getIds();
  }

  getSize(): number {
    return this._getData().getSize();
  }

  getNames(): string[] | undefined {
    return this._getData().getNames();
  }

  async loadGeometry(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<PointsGeometry> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const state = useTissUUmaps.getState();
    return await state.loadPointsGeometry(this._pointsId, {
      signal,
      onProgress,
    });
  }

  close(): void {
    // ignored intentionally
  }

  private _getData() {
    const state = useTissUUmaps.getState();
    const loadedDataKey = state.loadedPoints.get(this._pointsId);
    if (loadedDataKey !== undefined) {
      const loadedData = state.loadedPointsData.get(loadedDataKey);
      if (loadedData !== undefined) {
        return loadedData.data;
      }
    }
    throw new Error(`Data source not loaded for points ID ${this._pointsId}`);
  }
}

export function useLoadedPointsDataAdapter(): ViewerAdapter["loadPoints"] {
  const loadPoints = useTissUUmaps((state) => state.loadPoints);
  return useCallback(
    async (pointsId, options) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      await loadPoints(pointsId, { signal });
      return new LoadedPointsDataAdapter(pointsId);
    },
    [loadPoints],
  );
}
