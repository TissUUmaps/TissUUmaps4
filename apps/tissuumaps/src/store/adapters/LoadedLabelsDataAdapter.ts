import { useCallback } from "react";

import { type LabelsData, type UintArray } from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "..";

export class LoadedLabelsDataAdapter implements LabelsData {
  private readonly _labelsId: string;

  constructor(labelsId: string) {
    this._labelsId = labelsId;
  }

  get loadedLabels() {
    const state = useTissUUmaps.getState();
    const loadedLabels = state.loadedLabels.get(this._labelsId);
    if (loadedLabels === undefined) {
      throw new Error(`Labels with ID ${this._labelsId} is not loaded.`);
    }
    return loadedLabels;
  }

  get loadedLabelsDataSource() {
    const state = useTissUUmaps.getState();
    const loadedLabelsDataSource = state.loadedLabelsDataSources.get(
      this.loadedLabels.loadedDataSourceKey,
    );
    if (loadedLabelsDataSource === undefined) {
      throw new Error(
        `Data source with key ${this.loadedLabels.loadedDataSourceKey} for labels with ID ${this._labelsId} is not loaded.`,
      );
    }
    return loadedLabelsDataSource;
  }

  getIds(): number[] {
    return this.loadedLabelsDataSource.data.getIds();
  }

  getSize(): number {
    return this.loadedLabelsDataSource.data.getSize();
  }

  getWidth(level?: number): number {
    return this.loadedLabelsDataSource.data.getWidth(level);
  }

  getHeight(level?: number): number {
    return this.loadedLabelsDataSource.data.getHeight(level);
  }

  getLevelCount(): number {
    return this.loadedLabelsDataSource.data.getLevelCount();
  }

  getLevelScale(level: number): number {
    return this.loadedLabelsDataSource.data.getLevelScale(level);
  }

  getTileWidth(level: number): number {
    return this.loadedLabelsDataSource.data.getTileWidth(level);
  }

  getTileHeight(level: number): number {
    return this.loadedLabelsDataSource.data.getTileHeight(level);
  }

  loadTile(): Promise<UintArray> {
    throw new Error("Method not implemented.");
  }

  destroy(): void {
    // ignored intentionally
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
