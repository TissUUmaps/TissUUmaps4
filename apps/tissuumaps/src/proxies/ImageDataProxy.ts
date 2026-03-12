import { useCallback } from "react";

import {
  type CustomTileSource,
  type ImageData,
  type TileSourceConfig,
} from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "../store";
import { type LoadedImage } from "../store/image";

export class ImageDataProxy implements ImageData {
  private readonly _loadedImage: LoadedImage;

  constructor(loadedImage: LoadedImage) {
    this._loadedImage = loadedImage;
  }

  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this._loadedImage.data.getTileSource();
  }

  destroy(): void {
    this._loadedImage.data.destroy();
  }
}

export async function loadImageDataProxy(
  imageId: string,
  loadImage: (
    imageId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedImage>,
  options?: { signal?: AbortSignal },
) {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const loadedImage = await loadImage(imageId, { signal });
  signal?.throwIfAborted();
  return new ImageDataProxy(loadedImage);
}

export function useImageDataProxy(): ViewerAdapter["loadImage"] {
  const loadImage = useTissUUmaps((state) => state.loadImage);
  return useCallback(
    (imageId, options) => loadImageDataProxy(imageId, loadImage, options),
    [loadImage],
  );
}
