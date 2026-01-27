import { deepEqual } from "fast-equals";

import {
  type Image,
  type ImageData,
  type ImageDataSource,
} from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "./index";

export type ImageSlice = ImageSliceState & ImageSliceActions;

export type ImageSliceState = {
  images: Image[];
  _imageDataCache: { dataSource: ImageDataSource; data: ImageData }[];
};

export type ImageSliceActions = {
  addImage: (image: Image, index?: number) => void;
  updateImage: (imageId: string, updates: Partial<Image>) => void;
  moveImage: (imageId: string, newIndex: number) => void;
  deleteImage: (imageId: string) => void;
  clearImages: () => void;
  loadImage: (
    imageId: string,
    options: { signal?: AbortSignal },
  ) => Promise<ImageData>;
  unloadImage: (imageId: string) => void;
};

export const createImageSlice: TissUUmapsStateCreator<ImageSlice> = (
  set,
  get,
) => ({
  ...initialImageSliceState,
  addImage: (image, index) => {
    const state = get();
    if (state.images.some((x) => x.id === image.id)) {
      throw new Error(`Image with ID ${image.id} already exists.`);
    }
    set((draft) => {
      draft.images.splice(index ?? draft.images.length, 0, image);
    });
  },
  updateImage: (imageId, updates) => {
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
    const oldIndex = state.images.findIndex((image) => image.id === imageId);
    if (oldIndex === -1) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const [image] = draft.images.splice(oldIndex, 1);
        draft.images.splice(newIndex, 0, image!);
      });
    }
  },
  deleteImage: (imageId) => {
    const state = get();
    const index = state.images.findIndex((image) => image.id === imageId);
    if (index === -1) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    state.unloadImage(imageId);
    set((draft) => {
      draft.images.splice(index, 1);
    });
  },
  clearImages: () => {
    const state = get();
    while (state.images.length > 0) {
      state.deleteImage(state.images[0]!.id);
    }
    set(initialImageSliceState);
  },
  loadImage: async (imageId, { signal } = {}) => {
    signal?.throwIfAborted();
    const state = get();
    const image = state.images.find((image) => image.id === imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    const cache = state._imageDataCache.find(({ dataSource }) =>
      deepEqual(dataSource, image.dataSource),
    );
    if (cache !== undefined) {
      return cache.data;
    }
    const dataLoaderFactory = state.imageDataLoaderFactories.get(
      image.dataSource.type,
    );
    if (dataLoaderFactory === undefined) {
      throw new Error(
        `No image data loader found for type ${image.dataSource.type}.`,
      );
    }
    const dataLoader = dataLoaderFactory(
      image.dataSource,
      state.projectDir,
      state.loadTable,
    );
    const data = await dataLoader.loadImage({ signal });
    signal?.throwIfAborted();
    set((draft) => {
      draft._imageDataCache.push({ dataSource: image.dataSource, data });
    });
    return data;
  },
  unloadImage: (imageId) => {
    const state = get();
    const image = state.images.find((image) => image.id === imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    const cacheIndex = state._imageDataCache.findIndex(({ dataSource }) =>
      deepEqual(dataSource, image.dataSource),
    );
    if (cacheIndex !== -1) {
      const cache = state._imageDataCache[cacheIndex]!;
      set((draft) => {
        draft._imageDataCache.splice(cacheIndex, 1);
      });
      cache.data.destroy();
    }
  },
});

const initialImageSliceState: ImageSliceState = {
  images: [],
  _imageDataCache: [],
};
