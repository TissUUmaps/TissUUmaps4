import { useCallback } from "react";

import { type PointsData, type ProgressCallback } from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "../store";

export class LoadedPointsDataAdapter implements PointsData {
  private readonly _pointsId: string;

  constructor(pointsId: string) {
    this._pointsId = pointsId;
  }

  get loadedPoints() {
    const state = useTissUUmaps.getState();
    const loadedPoints = state.loadedPoints.get(this._pointsId);
    if (loadedPoints === undefined) {
      throw new Error(`Points with ID ${this._pointsId} is not loaded.`);
    }
    return loadedPoints;
  }

  get loadedPointsDataSource() {
    const state = useTissUUmaps.getState();
    const loadedPointsDataSource = state.loadedPointsDataSources.get(
      this.loadedPoints.loadedDataSourceKey,
    );
    if (loadedPointsDataSource === undefined) {
      throw new Error(
        `Data source with key ${this.loadedPoints.loadedDataSourceKey} for points with ID ${this._pointsId} is not loaded.`,
      );
    }
    return loadedPointsDataSource;
  }

  getIds(): number[] {
    return this.loadedPointsDataSource.data.getIds();
  }

  getSize(): number {
    return this.loadedPointsDataSource.data.getSize();
  }

  async suggestDimensionQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this.loadedPointsDataSource.data.suggestDimensionQueries(
      currentQuery,
      options,
    );
  }

  async resolveDimensionQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this.loadedPointsDataSource.data.resolveDimensionQuery(
      query,
      options,
    );
  }

  async loadCoordinates(
    dimension: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<Float32Array> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const state = useTissUUmaps.getState();
    return await state.loadPointsCoordinates(this._pointsId, dimension, {
      signal,
      onProgress,
    });
  }

  destroy(): void {
    // ignored intentionally
  }
}

export function useLoadedPointsDataAdapter(): ViewerAdapter["loadPoints"] {
  const loadPoints = useTissUUmaps((state) => state.loadPoints);
  return useCallback(
    async (pointsId, options) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      await loadPoints(pointsId, { signal });
      signal?.throwIfAborted();
      return new LoadedPointsDataAdapter(pointsId);
    },
    [loadPoints],
  );
}
