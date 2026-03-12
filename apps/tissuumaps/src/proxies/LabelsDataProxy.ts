import { useCallback } from "react";

import { type LabelsData, type UintArray } from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "../store";
import { type LoadedLabels } from "../store/labels";

export class LabelsDataProxy implements LabelsData {
  private readonly _loadedLabels: LoadedLabels;

  constructor(loadedLabels: LoadedLabels) {
    this._loadedLabels = loadedLabels;
  }

  getIds(): number[] {
    return this._loadedLabels.data.getIds();
  }

  getSize(): number {
    return this._loadedLabels.data.getSize();
  }

  getWidth(level?: number): number {
    return this._loadedLabels.data.getWidth(level);
  }

  getHeight(level?: number): number {
    return this._loadedLabels.data.getHeight(level);
  }

  getLevelCount(): number {
    return this._loadedLabels.data.getLevelCount();
  }

  getLevelScale(level: number): number {
    return this._loadedLabels.data.getLevelScale(level);
  }

  getTileWidth(level: number): number {
    return this._loadedLabels.data.getTileWidth(level);
  }

  getTileHeight(level: number): number {
    return this._loadedLabels.data.getTileHeight(level);
  }

  async loadTile(
    level: number,
    x: number,
    y: number,
    options?: { signal?: AbortSignal },
  ): Promise<UintArray> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._loadedLabels.data.loadTile(level, x, y, { signal });
  }

  destroy(): void {
    this._loadedLabels.data.destroy();
  }
}

export async function loadLabelsDataProxy(
  labelsId: string,
  loadLabels: (
    labelsId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedLabels>,
  options?: { signal?: AbortSignal },
) {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const loadedLabels = await loadLabels(labelsId, { signal });
  signal?.throwIfAborted();
  return new LabelsDataProxy(loadedLabels);
}

export function useLabelsDataProxy(): ViewerAdapter["loadLabels"] {
  const loadLabels = useTissUUmaps((state) => state.loadLabels);
  return useCallback(
    (labelsId, options) => loadLabelsDataProxy(labelsId, loadLabels, options),
    [loadLabels],
  );
}
