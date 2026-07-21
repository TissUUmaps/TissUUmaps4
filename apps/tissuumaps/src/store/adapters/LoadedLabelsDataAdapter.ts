import { useCallback } from "react";

import type { LabelsData, UintArray } from "@tissuumaps/core";
import type { ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "..";

export class LoadedLabelsDataAdapter implements LabelsData {
  private readonly _labelsId: string;

  constructor(labelsId: string) {
    this._labelsId = labelsId;
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

  getWidth(level?: number): number {
    return this._getData().getWidth(level);
  }

  getHeight(level?: number): number {
    return this._getData().getHeight(level);
  }

  getLevelCount(): number {
    return this._getData().getLevelCount();
  }

  getLevelScale(level: number): number {
    return this._getData().getLevelScale(level);
  }

  getTileWidth(level: number): number {
    return this._getData().getTileWidth(level);
  }

  getTileHeight(level: number): number {
    return this._getData().getTileHeight(level);
  }

  async loadTile(): Promise<UintArray> {
    return Promise.reject(new Error("Method not implemented."));
  }

  close(): void {
    // ignored intentionally
  }

  private _getData() {
    const state = useTissUUmaps.getState();
    const loadedDataKey = state.loadedLabels.get(this._labelsId);
    if (loadedDataKey !== undefined) {
      const loadedData = state.loadedLabelsData.get(loadedDataKey);
      if (loadedData !== undefined) {
        return loadedData.data;
      }
    }
    throw new Error(`Data source not loaded for labels ID ${this._labelsId}`);
  }
}

export function useLoadedLabelsDataAdapter(): ViewerAdapter["loadLabels"] {
  const loadLabels = useTissUUmaps((state) => state.loadLabels);
  return useCallback(
    async (labelsId, options) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      await loadLabels(labelsId, { signal });
      signal?.throwIfAborted();
      return new LoadedLabelsDataAdapter(labelsId);
    },
    [loadLabels],
  );
}
