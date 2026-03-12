import { deepEqual } from "fast-equals";

import {
  type Image,
  type ImageData,
  type ImageDataLoader,
  type ImageDataSource,
} from "@tissuumaps/core";

import { loadTableDataProxy } from "../proxies/TableDataProxy";
import { type TissUUmapsStateCreator } from "./index";

export type LoadedImage = {
  data: ImageData;
};

export type ImageSlice = ImageSliceState & ImageSliceActions;

export type ImageSliceState = {
  images: Image[];
  loadedImages: Map<string, LoadedImage>;
  imageDataSourceCaches: { dataSource: ImageDataSource; data: ImageData }[];
};

export type ImageSliceActions = {
  addImage: (image: Image, index?: number) => void;
  updateImage: (imageId: string, updates: Partial<Image>) => void;
  moveImage: (imageId: string, newIndex: number) => void;
  deleteImage: (imageId: string) => void;
  clearImages: () => void;
  createImageDataLoader: (imageId: string) => ImageDataLoader<ImageData>;
  loadImage: (
    imageId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedImage>;
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
  createImageDataLoader: (imageId) => {
    const state = get();
    const image = state.images.find((image) => image.id === imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
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
      state.workspace,
      (tableId, options) =>
        loadTableDataProxy(
          tableId,
          state.loadTable,
          state.loadTableColumn,
          options,
        ),
    );
    return dataLoader;
  },
  loadImage: async (imageId, options) => {
    const { signal, reload = false } = options ?? {};
    signal?.throwIfAborted();
    const state = get();
    const loadedImage = state.loadedImages.get(imageId);
    if (loadedImage !== undefined && !reload) {
      return loadedImage;
    }
    const image = state.images.find((image) => image.id === imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    let data;
    const dataSourceCache = state.imageDataSourceCaches.find(({ dataSource }) =>
      deepEqual(dataSource, image.dataSource),
    );
    if (dataSourceCache !== undefined) {
      data = dataSourceCache.data;
    } else {
      const dataLoader = state.createImageDataLoader(imageId);
      const newData = await dataLoader.loadImage({ signal });
      signal?.throwIfAborted();
      set((draft) => {
        draft.imageDataSourceCaches.push({
          dataSource: image.dataSource,
          data: newData,
        });
      });
      data = newData;
    }
    const newLoadedImage = { data };
    set((draft) => {
      draft.loadedImages.set(imageId, newLoadedImage);
    });
    return newLoadedImage;
  },
  unloadImage: (imageId) => {
    const state = get();
    const loadedImage = state.loadedImages.get(imageId);
    if (loadedImage !== undefined) {
      let destroy = true;
      for (const other of state.loadedImages.values()) {
        if (other !== loadedImage && other.data === loadedImage.data) {
          destroy = false;
          break;
        }
      }
      set((draft) => {
        draft.loadedImages.delete(imageId);
        if (destroy) {
          draft.imageDataSourceCaches = draft.imageDataSourceCaches.filter(
            (dataSourceCache) => dataSourceCache.data !== loadedImage.data,
          );
        }
      });
      if (destroy) {
        loadedImage.data.destroy();
      }
    }
  },
});

const initialImageSliceState: ImageSliceState = {
  images: [],
  loadedImages: new Map(),
  imageDataSourceCaches: [],
};
