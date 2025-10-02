import { ImageData } from "../data/image";
import { CompleteImage, CompleteImageDataSource } from "../model/image";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type ImageSlice = ImageSliceState & ImageSliceActions;

export type ImageSliceState = {
  imageMap: Map<string, CompleteImage>;
  imageDataCache: Map<CompleteImageDataSource, ImageData>;
};

export type ImageSliceActions = {
  addImage: (image: CompleteImage, index?: number) => void;
  loadImage: (image: CompleteImage, signal?: AbortSignal) => Promise<ImageData>;
  loadImageByID: (imageId: string, signal?: AbortSignal) => Promise<ImageData>;
  unloadImage: (image: CompleteImage) => void;
  unloadImageByID: (imageId: string) => void;
  deleteImage: (image: CompleteImage) => void;
  deleteImageByID: (imageId: string) => void;
  clearImages: () => void;
};

export const createImageSlice: BoundStoreStateCreator<ImageSlice> = (
  set,
  get,
) => ({
  ...initialImageSliceState,
  addImage: (image, index) => {
    const state = get();
    const oldImage = state.imageMap.get(image.id);
    if (oldImage !== undefined) {
      state.unloadImage(oldImage);
    }
    set((draft) => {
      draft.imageMap = MapUtils.cloneAndSpliceSet(
        draft.imageMap,
        image.id,
        image,
        index,
      );
    });
  },
  loadImage: async (image, signal) => {
    signal?.throwIfAborted();
    const state = get();
    let imageData = state.imageDataCache.get(image.dataSource);
    if (imageData !== undefined) {
      return imageData;
    }
    const imageDataLoaderFactory = state.imageDataLoaderFactories.get(
      image.dataSource.type,
    );
    if (imageDataLoaderFactory === undefined) {
      throw new Error(
        `No image data loader found for type ${image.dataSource.type}.`,
      );
    }
    const imageDataLoader = imageDataLoaderFactory(
      image.dataSource,
      state.projectDir,
      state.loadTableByID,
    );
    imageData = await imageDataLoader.loadImage(signal);
    signal?.throwIfAborted();
    set((draft) => {
      draft.imageDataCache.set(image.dataSource, imageData);
    });
    return imageData;
  },
  loadImageByID: async (imageId, signal) => {
    signal?.throwIfAborted();
    const state = get();
    const image = state.imageMap.get(imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    return state.loadImage(image, signal);
  },
  unloadImage: (image) => {
    const state = get();
    const imageData = state.imageDataCache.get(image.dataSource);
    set((draft) => {
      draft.imageDataCache.delete(image.dataSource);
    });
    imageData?.destroy();
  },
  unloadImageByID: (imageId) => {
    const state = get();
    const image = state.imageMap.get(imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    state.unloadImage(image);
  },
  deleteImage: (image) => {
    const state = get();
    state.unloadImage(image);
    set((draft) => {
      draft.imageMap.delete(image.id);
    });
  },
  deleteImageByID: (imageId) => {
    const state = get();
    const image = state.imageMap.get(imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    state.deleteImage(image);
  },
  clearImages: () => {
    const state = get();
    state.imageMap.forEach((image) => {
      state.deleteImage(image);
    });
    set(initialImageSliceState);
  },
});

const initialImageSliceState: ImageSliceState = {
  imageMap: new Map(),
  imageDataCache: new Map(),
};
