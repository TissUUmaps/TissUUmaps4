import { deepEqual } from "fast-equals";

import {
  type Image,
  type ImageData,
  type ImageDataSource,
  type ProgressCallback,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

type CachedImageData = {
  dataSource: ImageDataSource;
  data: ImageData;
};

export type ImageSlice = ImageSliceState & ImageSliceActions;

export type ImageSliceState = {
  images: Image[];
  loadedImages: Map<string, string>;
  loadedImageData: Map<string, CachedImageData>;
};

export type ImageSliceActions = {
  addImage: (image: Image, index?: number) => void;
  updateImage: (imageId: string, updates: Partial<Image>) => void;
  moveImage: (imageId: string, newIndex: number) => void;
  deleteImage: (imageId: string) => boolean;
  clearImages: () => void;
  loadImage: (
    imageId: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<ImageData>;
  unloadImage: (imageId: string) => boolean;
};

export const createImageSlice: TissUUmapsStateCreator<ImageSlice> = (
  set,
  get,
) => ({
  ...createInitialImageSliceState(),
  addImage: (image, index) => {
    const state = get();
    if (state.images.some((x) => x.id === image.id)) {
      throw new Error(`Image with ID ${image.id} already exists.`);
    }
    if (index !== undefined && (index < 0 || index > state.images.length)) {
      throw new Error(`Index ${index} out of bounds.`);
    }
    set((draft) => {
      draft.images.splice(index ?? draft.images.length, 0, image);
    });
  },
  updateImage: (imageId, updates) => {
    if (updates.id !== undefined || updates.dataSource !== undefined) {
      throw new Error("Updating image ID or data source is not allowed.");
    }
    const state = get();
    const index = state.images.findIndex((image) => image.id === imageId);
    if (index === -1) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    set((draft) => {
      draft.images[index] = { ...draft.images[index]!, ...updates };
    });
  },
  moveImage: (imageId, newIndex) => {
    const state = get();
    if (newIndex < 0 || newIndex >= state.images.length) {
      throw new Error(`Index ${newIndex} out of bounds.`);
    }
    const oldIndex = state.images.findIndex((image) => image.id === imageId);
    if (oldIndex === -1) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const imageDraft = draft.images.splice(oldIndex, 1)[0]!;
        draft.images.splice(newIndex, 0, imageDraft);
      });
    }
  },
  deleteImage: (imageId) => {
    const state = get();
    const index = state.images.findIndex((image) => image.id === imageId);
    if (index !== -1) {
      if (state.loadedImages.has(imageId)) {
        state.unloadImage(imageId);
      }
      set((draft) => {
        draft.images.splice(index, 1);
      });
      return true;
    }
    return false;
  },
  clearImages: () => {
    const state = get();
    for (const loadedData of state.loadedImageData.values()) {
      loadedData.data.destroy();
    }
    set(createInitialImageSliceState());
  },
  loadImage: deduplicate(
    async (imageId, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the image is already loaded
      const state = get();
      const loadedDataKey = state.loadedImages.get(imageId);
      if (loadedDataKey !== undefined && !reload) {
        const loadedData = state.loadedImageData.get(loadedDataKey);
        if (loadedData !== undefined) {
          return loadedData.data;
        }
      }
      // Find the image and the corresponding data source (if loaded)
      const image = state.images.find((image) => image.id === imageId);
      if (image === undefined) {
        throw new Error(`Image with ID ${imageId} not found.`);
      }
      let oldLoadedData: CachedImageData | undefined;
      for (const loadedData of state.loadedImageData.values()) {
        if (deepEqual(loadedData.dataSource, image.dataSource)) {
          oldLoadedData = loadedData;
          break;
        }
      }
      // Load the data source if not already loaded or if a reload has been requested
      let loadedData = oldLoadedData;
      if (loadedData === undefined || reload) {
        const { dataStorageFactory } =
          state.imageDataStorageRegistry.get(image.dataSource.type) ?? {};
        if (dataStorageFactory === undefined) {
          throw new Error(
            `No image data storage adapter registered for data source type ${image.dataSource.type}.`,
          );
        }
        const dataStorage = dataStorageFactory(
          image.dataSource,
          state.workspace,
        );
        const data = await dataStorage.loadImage({ signal, onProgress });
        signal?.throwIfAborted();
        // Check if the image has been deleted or its data source has changed
        const currentState = get();
        const currentImage = currentState.images.find(
          (image) => image.id === imageId,
        );
        if (
          currentImage === undefined ||
          !deepEqual(currentImage.dataSource, image.dataSource)
        ) {
          data.destroy();
          throw new DOMException(
            `Image with ID ${imageId} has been deleted or its data source has changed.`,
            "AbortError",
          );
        }
        loadedData = { dataSource: currentImage.dataSource, data };
      }
      // Store the loaded image and the corresponding data source in the state
      set((draft) => {
        let loadedDataKey;
        for (const [key, value] of draft.loadedImageData) {
          if (deepEqual(value.dataSource, loadedData.dataSource)) {
            loadedDataKey = key;
            break;
          }
        }
        if (loadedDataKey === undefined) {
          do {
            loadedDataKey = crypto.randomUUID();
          } while (draft.loadedImageData.has(loadedDataKey));
        }
        draft.loadedImages.set(imageId, loadedDataKey);
        draft.loadedImageData.set(loadedDataKey, loadedData);
      });
      // Clean up old data if the loaded data source has changed
      if (
        oldLoadedData !== undefined &&
        oldLoadedData.data !== loadedData.data
      ) {
        oldLoadedData.data.destroy();
      }
      return loadedData.data;
    },
    (_imageId, options) => options?.signal,
  ),
  unloadImage: (imageId) => {
    const state = get();
    const loadedDataKey = state.loadedImages.get(imageId);
    if (loadedDataKey === undefined) {
      return false;
    }
    const loadedData = state.loadedImageData.get(loadedDataKey);
    if (loadedData === undefined) {
      throw new Error(`Data source for image with ID ${imageId} not loaded.`);
    }
    let destroy = true;
    for (const [otherImageId, otherLoadedDataKey] of state.loadedImages) {
      if (otherImageId !== imageId && otherLoadedDataKey === loadedDataKey) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedImages.delete(imageId);
      if (destroy) {
        draft.loadedImageData.delete(loadedDataKey);
      }
    });
    if (destroy) {
      loadedData.data.destroy();
    }
    return true;
  },
});

function createInitialImageSliceState(): ImageSliceState {
  return {
    images: [],
    loadedImages: new Map(),
    loadedImageData: new Map(),
  };
}
