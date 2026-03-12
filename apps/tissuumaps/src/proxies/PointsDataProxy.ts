import { useCallback } from "react";

import { type PointsData } from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "../store";
import { type LoadedPoints, type LoadedPointsDimension } from "../store/points";

export class PointsDataProxy implements PointsData {
  private readonly _loadedPoints: LoadedPoints;
  private readonly _loadPointsDimension: (
    dimension: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedPointsDimension>;

  constructor(
    loadedPoints: LoadedPoints,
    loadPointsDimension: (
      dimension: string,
      options?: { signal?: AbortSignal; reload?: boolean },
    ) => Promise<LoadedPointsDimension>,
  ) {
    this._loadedPoints = loadedPoints;
    this._loadPointsDimension = loadPointsDimension;
  }

  getIds(): number[] {
    return this._loadedPoints.data.getIds();
  }

  getSize(): number {
    return this._loadedPoints.data.getSize();
  }

  async suggestDimensionQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._loadedPoints.data.suggestDimensionQueries(currentQuery, {
      signal,
    });
  }

  async resolveDimensionQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._loadedPoints.data.resolveDimensionQuery(query, {
      signal,
    });
  }

  async loadCoordinates(
    dimension: string,
    options?: { signal?: AbortSignal },
  ): Promise<Float32Array> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const loadedPointsDimension = await this._loadPointsDimension(dimension, {
      signal,
    });
    signal?.throwIfAborted();
    return loadedPointsDimension.coordinates;
  }

  destroy(): void {
    this._loadedPoints.data.destroy();
  }
}

export async function loadPointsDataProxy(
  pointsId: string,
  loadPoints: (
    pointsId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedPoints>,
  loadPointsDimension: (
    pointsId: string,
    dimension: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedPointsDimension>,
  options?: { signal?: AbortSignal },
) {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const loadedPoints = await loadPoints(pointsId, { signal });
  signal?.throwIfAborted();
  return new PointsDataProxy(loadedPoints, (dimension, options) =>
    loadPointsDimension(pointsId, dimension, options),
  );
}

export function usePointsDataProxy(): ViewerAdapter["loadPoints"] {
  const loadPoints = useTissUUmaps((state) => state.loadPoints);
  const loadPointsDimension = useTissUUmaps(
    (state) => state.loadPointsDimension,
  );
  return useCallback(
    (pointsId, options) =>
      loadPointsDataProxy(pointsId, loadPoints, loadPointsDimension, options),
    [loadPoints, loadPointsDimension],
  );
}
