import { useCallback } from "react";

import {
  type MultiPolygon,
  type ProgressCallback,
  type ShapesData,
} from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "../store";

export class LoadedShapesDataAdapter implements ShapesData {
  private readonly _shapesId: string;

  constructor(shapesId: string) {
    this._shapesId = shapesId;
  }

  get loadedShapes() {
    const state = useTissUUmaps.getState();
    const loadedShapes = state.loadedShapes.get(this._shapesId);
    if (loadedShapes === undefined) {
      throw new Error(`Shapes with ID ${this._shapesId} is not loaded.`);
    }
    return loadedShapes;
  }

  get loadedShapesDataSource() {
    const state = useTissUUmaps.getState();
    const loadedShapesDataSource = state.loadedShapesDataSources.get(
      this.loadedShapes.loadedDataSourceKey,
    );
    if (loadedShapesDataSource === undefined) {
      throw new Error(
        `Data source with key ${this.loadedShapes.loadedDataSourceKey} for shapes with ID ${this._shapesId} is not loaded.`,
      );
    }
    return loadedShapesDataSource;
  }

  getIds(): number[] {
    return this.loadedShapesDataSource.data.getIds();
  }

  getSize(): number {
    return this.loadedShapesDataSource.data.getSize();
  }

  async loadMultiPolygons(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<MultiPolygon[]> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const state = useTissUUmaps.getState();
    return await state.loadShapesMultiPolygons(this._shapesId, {
      signal,
      onProgress,
    });
  }

  destroy(): void {
    // ignored intentionally
  }
}

export function useLoadedShapesDataAdapter(): ViewerAdapter["loadShapes"] {
  const loadShapes = useTissUUmaps((state) => state.loadShapes);
  return useCallback(
    async (shapesId, options) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      await loadShapes(shapesId, { signal });
      signal?.throwIfAborted();
      return new LoadedShapesDataAdapter(shapesId);
    },
    [loadShapes],
  );
}
