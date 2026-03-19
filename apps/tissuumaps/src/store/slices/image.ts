import { deepEqual } from "fast-equals";

import {
  type Image,
  type ImageData,
  type ImageDataSource,
  type ProgressCallback,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

type LoadedImage = {
  loadedDataSourceKey: string;
};

type LoadedImageDataSource = {
  dataSource: ImageDataSource;
  data: ImageData;
};

export type ImageSlice = ImageSliceState & ImageSliceActions;

export type ImageSliceState = {
  images: Image[];
  loadedImages: Map<string, LoadedImage>;
  loadedImageDataSources: Map<string, LoadedImageDataSource>;
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
  ) => Promise<LoadedImage>;
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
    for (const loadedDataSource of state.loadedImageDataSources.values()) {
      loadedDataSource.data.destroy();
    }
    set(createInitialImageSliceState());
  },
  loadImage: deduplicate(async (imageId, options) => {
    const { signal, reload = false, onProgress } = options ?? {};
    signal?.throwIfAborted();
    // Check if the image is already loaded
    const state = get();
    const loadedImage = state.loadedImages.get(imageId);
    if (loadedImage !== undefined && !reload) {
      return loadedImage;
    }
    // Find the image and the corresponding data source (if loaded)
    const image = state.images.find((image) => image.id === imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    let oldLoadedDataSource: LoadedImageDataSource | undefined;
    for (const loadedDataSource of state.loadedImageDataSources.values()) {
      if (deepEqual(loadedDataSource.dataSource, image.dataSource)) {
        oldLoadedDataSource = loadedDataSource;
        break;
      }
    }
    // Load the data source if not already loaded or if a reload has been requested
    let loadedDataSource = oldLoadedDataSource;
    if (loadedDataSource === undefined || reload) {
      const { dataLoaderFactory } =
        state.imageDataLoaderRegistry.get(image.dataSource.type) ?? {};
      if (dataLoaderFactory === undefined) {
        throw new Error(
          `No image data loader registered for data source type ${image.dataSource.type}.`,
        );
      }
      const dataLoader = dataLoaderFactory(image.dataSource, state.workspace);
      const data = await dataLoader.loadImage({ signal, onProgress });
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
      loadedDataSource = { dataSource: image.dataSource, data };
    }
    // Store the loaded image and the corresponding data source in the state
    let newLoadedImage: LoadedImage;
    set((draft) => {
      let loadedDataSourceKey;
      for (const [key, value] of draft.loadedImageDataSources) {
        if (deepEqual(value.dataSource, loadedDataSource.dataSource)) {
          loadedDataSourceKey = key;
          break;
        }
      }
      if (loadedDataSourceKey === undefined) {
        do {
          loadedDataSourceKey = crypto.randomUUID();
        } while (draft.loadedImageDataSources.has(loadedDataSourceKey));
      }
      newLoadedImage = { loadedDataSourceKey };
      draft.loadedImages.set(imageId, newLoadedImage);
      draft.loadedImageDataSources.set(loadedDataSourceKey, loadedDataSource);
    });
    // Clean up old data if the loaded data source has changed
    if (
      oldLoadedDataSource !== undefined &&
      oldLoadedDataSource.data !== loadedDataSource.data
    ) {
      oldLoadedDataSource.data.destroy();
    }
    return newLoadedImage!;
  }),
  unloadImage: (imageId) => {
    const state = get();
    const loadedImage = state.loadedImages.get(imageId);
    if (loadedImage === undefined) {
      return false;
    }
    const loadedDataSource = state.loadedImageDataSources.get(
      loadedImage.loadedDataSourceKey,
    );
    if (loadedDataSource === undefined) {
      throw new Error(`Data source for image with ID ${imageId} not loaded.`);
    }
    let destroy = true;
    for (const [otherImageId, otherLoadedImage] of state.loadedImages) {
      if (
        otherImageId !== imageId &&
        otherLoadedImage.loadedDataSourceKey === loadedImage.loadedDataSourceKey
      ) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedImages.delete(imageId);
      if (destroy) {
        draft.loadedImageDataSources.delete(loadedImage.loadedDataSourceKey);
      }
    });
    if (destroy) {
      loadedDataSource.data.destroy();
    }
    return true;
  },
});

function createInitialImageSliceState(): ImageSliceState {
  return {
    images: [],
    loadedImages: new Map(),
    loadedImageDataSources: new Map(),
  };
}
