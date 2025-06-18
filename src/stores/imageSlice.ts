import { IImageData, IImageDataLoader } from "../data/image";
import { IImageModel } from "../models/image";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type ImageSlice = ImageSliceState & ImageSliceActions;

export type ImageSliceState = {
  images: Map<string, IImageModel>;
  imageData: Map<string, IImageData>;
  imageDataLoaders: Map<string, IImageDataLoader>;
};

export type ImageSliceActions = {
  setImage: (imageId: string, image: IImageModel, imageIndex?: number) => void;
  loadImage: (imageId: string, image?: IImageModel) => Promise<IImageData>;
  deleteImage: (imageId: string) => void;
  registerImageDataLoader: (
    imageDataSourceType: string,
    imageDataLoader: IImageDataLoader,
  ) => void;
  unregisterImageDataLoader: (imageDataSourceType: string) => void;
};

export const createImageSlice: BoundStoreStateCreator<ImageSlice> = (
  set,
  get,
) => ({
  ...initialImageSliceState,
  setImage: (imageId, image, imageIndex) => {
    set((draft) => {
      draft.images = MapUtils.cloneAndSet(
        draft.images,
        imageId,
        image,
        imageIndex,
      );
      draft.imageData.delete(imageId);
    });
  },
  loadImage: async (imageId, image) => {
    const state = get();
    if (state.imageData.has(imageId)) {
      return state.imageData.get(imageId)!;
    }
    if (image === undefined) {
      image = state.images.get(imageId);
      if (image === undefined) {
        throw new Error(`No image found for ID: ${imageId}`);
      }
    }
    const imageDataLoader = state.imageDataLoaders.get(image.dataSource.type);
    if (imageDataLoader === undefined) {
      throw new Error(
        `No image data loader registered for image data source type: ${image.dataSource.type}`,
      );
    }
    const imageData = await imageDataLoader.loadImage(image.dataSource);
    set((draft) => {
      draft.imageData.set(imageId, imageData);
    });
    return imageData;
  },
  deleteImage: (imageId) => {
    set((draft) => {
      draft.images.delete(imageId);
      draft.imageData.delete(imageId);
    });
  },
  registerImageDataLoader: (imageDataSourceType, imageDataLoader) => {
    set((draft) => {
      if (draft.imageDataLoaders.has(imageDataSourceType)) {
        console.warn(
          `Image data loader was already registered for image data source type: ${imageDataSourceType}`,
        );
      }
      draft.imageDataLoaders.set(imageDataSourceType, imageDataLoader);
    });
  },
  unregisterImageDataLoader: (imageDataSourceType) => {
    set((draft) => {
      if (!draft.imageDataLoaders.delete(imageDataSourceType)) {
        console.warn(
          `No image data loader registered for image data source type: ${imageDataSourceType}`,
        );
      }
    });
  },
});

const initialImageSliceState: ImageSliceState = {
  images: new Map<string, IImageModel>(),
  imageData: new Map<string, IImageData>(),
  imageDataLoaders: new Map<string, IImageDataLoader>(),
};
