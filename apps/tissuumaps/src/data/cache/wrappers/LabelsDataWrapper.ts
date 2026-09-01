import type { LabelsData, ProgressCallback, UintArray } from "@tissuumaps/core";

import { DataWrapperBase } from "./DataWrapperBase";

/**
 * Cache wrapper around labels data, delegating to the wrapped data
 */
export class LabelsDataWrapper
  extends DataWrapperBase<LabelsData>
  implements LabelsData
{
  getIds(): number[] {
    return this.data.getIds();
  }

  getSize(): number {
    return this.data.getSize();
  }

  getNames(): string[] | undefined {
    return this.data.getNames();
  }

  getWidth(level?: number): number {
    return this.data.getWidth(level);
  }

  getHeight(level?: number): number {
    return this.data.getHeight(level);
  }

  getLevelCount(): number {
    return this.data.getLevelCount();
  }

  getLevelScale(level: number): number {
    return this.data.getLevelScale(level);
  }

  getTileWidth(level: number): number {
    return this.data.getTileWidth(level);
  }

  getTileHeight(level: number): number {
    return this.data.getTileHeight(level);
  }

  loadTile(
    level: number,
    x: number,
    y: number,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<UintArray> {
    // caching is handled by renderers
    return this.data.loadTile(level, x, y, options);
  }
}
