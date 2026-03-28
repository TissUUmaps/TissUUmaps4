import { useCallback } from "react";

import {
  type CustomTileSource,
  type ImageData,
  type TileSourceConfig,
} from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "..";

export class LoadedImageDataAdapter implements ImageData {
  private readonly _imageId: string;

  constructor(imageId: string) {
    this._imageId = imageId;
  }

  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this._getData().getTileSource();
  }

  destroy(): void {
    // ignored intentionally
  }

  private _getData() {
    const state = useTissUUmaps.getState();
    const loadedDataKey = state.loadedImages.get(this._imageId);
    if (loadedDataKey !== undefined) {
      const loadedData = state.loadedImageData.get(loadedDataKey);
      if (loadedData !== undefined) {
        return loadedData.data;
      }
    }
    throw new Error(`Data source not loaded for image ID ${this._imageId}`);
  }
}

export function useLoadedImageDataAdapter(): ViewerAdapter["loadImage"] {
  const loadImage = useTissUUmaps((state) => state.loadImage);
  return useCallback(
    async (imageId, options) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      await loadImage(imageId, { signal });
      signal?.throwIfAborted();
      return new LoadedImageDataAdapter(imageId);
    },
    [loadImage],
  );
}
