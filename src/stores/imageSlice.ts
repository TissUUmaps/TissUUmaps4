import { IImageModel } from "../models/image";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type ImageSlice = ImageSliceState & ImageSliceActions;

export type ImageSliceState = {
  images: Map<string, IImageModel>;
};

export type ImageSliceActions = {
  setImage: (imageId: string, image: IImageModel, imageIndex?: number) => void;
  deleteImage: (imageId: string) => void;
};

export const createImageSlice: BoundStoreStateCreator<ImageSlice> = (set) => ({
  ...initialImageSliceState,
  setImage: (imageId, image, imageIndex) =>
    set((draft) => {
      draft.images = MapUtils.cloneAndSet(
        draft.images,
        imageId,
        image,
        imageIndex,
      );
    }),
  deleteImage: (imageId) => set((draft) => draft.images.delete(imageId)),
});

const initialImageSliceState: ImageSliceState = {
  images: new Map<string, IImageModel>(),
};
