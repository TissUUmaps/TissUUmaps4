import { useCallback } from "react";

import {
  type CustomTileSource,
  type ImageData,
  type TileSourceConfig,
} from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "../store";

export class LoadedImageDataAdapter implements ImageData {
  private readonly _imageId: string;

  constructor(imageId: string) {
    this._imageId = imageId;
  }

  get loadedImage() {
    const state = useTissUUmaps.getState();
    const loadedImage = state.loadedImages.get(this._imageId);
    if (loadedImage === undefined) {
      throw new Error(`Image with ID ${this._imageId} is not loaded.`);
    }
    return loadedImage;
  }

  get loadedImageDataSource() {
    const state = useTissUUmaps.getState();
    const loadedImageDataSource = state.loadedImageDataSources.get(
      this.loadedImage.loadedDataSourceKey,
    );
    if (loadedImageDataSource === undefined) {
      throw new Error(
        `Data source with key ${this.loadedImage.loadedDataSourceKey} for image with ID ${this._imageId} is not loaded.`,
      );
    }
    return loadedImageDataSource;
  }

  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this.loadedImageDataSource.data.getTileSource();
  }

  destroy(): void {
    // ignored intentionally
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
