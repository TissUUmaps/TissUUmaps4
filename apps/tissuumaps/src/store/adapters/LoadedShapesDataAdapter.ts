import { useCallback } from "react";

import {
  type MultiPolygon,
  type ProgressCallback,
  type ShapesData,
} from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "..";

export class LoadedShapesDataAdapter implements ShapesData {
  private readonly _shapesId: string;

  constructor(shapesId: string) {
    this._shapesId = shapesId;
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

  close(): void {
    // ignored intentionally
  }

  private _getData() {
    const state = useTissUUmaps.getState();
    const loadedDataKey = state.loadedShapes.get(this._shapesId);
    if (loadedDataKey !== undefined) {
      const loadedData = state.loadedShapesData.get(loadedDataKey);
      if (loadedData !== undefined) {
        return loadedData.data;
      }
    }
    throw new Error(`Data source not loaded for shapes ID ${this._shapesId}`);
  }
}

export function useLoadedShapesDataAdapter(): ViewerAdapter["getShapes"] {
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
