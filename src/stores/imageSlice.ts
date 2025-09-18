import { IImageData, IImageDataLoader } from "../data/image";
import {
  DEFAULT_IMAGE_DATA_SOURCE,
  DefaultImageDataLoader,
  IDefaultImageDataSourceModel,
} from "../data/loaders/default";
import { ITableData } from "../data/table";
import { IImageDataSourceModel, IImageModel } from "../models/image";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

type ImageDataLoaderFactory = (
  dataSource: IImageDataSourceModel,
  projectDir: FileSystemDirectoryHandle | null,
  loadTableByID: (tableId: string) => Promise<ITableData>,
) => IImageDataLoader<IImageData>;

export type ImageSlice = ImageSliceState & ImageSliceActions;

export type ImageSliceState = {
  imageMap: Map<string, IImageModel>;
  imageDataCache: Map<IImageDataSourceModel, IImageData>;
  imageDataLoaderFactories: Map<string, ImageDataLoaderFactory>;
};

export type ImageSliceActions = {
  setImage: (image: IImageModel, index?: number) => void;
  loadImage: (image: IImageModel) => Promise<IImageData>;
  loadImageByID: (imageId: string) => Promise<IImageData>;
  deleteImage: (image: IImageModel) => void;
};

export const createImageSlice: BoundStoreStateCreator<ImageSlice> = (
  set,
  get,
) => ({
  ...initialImageSliceState,
  setImage: (image, index) => {
    set((draft) => {
      const oldImage = draft.imageMap.get(image.id);
      draft.imageMap = MapUtils.cloneAndSpliceSet(
        draft.imageMap,
        image.id,
        image,
        index,
      );
      if (oldImage !== undefined) {
        draft.imageDataCache.delete(oldImage.dataSource);
      }
    });
  },
  loadImage: async (image) => {
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
    imageData = await imageDataLoader.loadImage();
    set((draft) => {
      draft.imageDataCache.set(image.dataSource, imageData);
    });
    return imageData;
  },
  loadImageByID: async (imageId) => {
    const state = get();
    const image = state.imageMap.get(imageId);
    if (image === undefined) {
      throw new Error(`Image with ID ${imageId} not found.`);
    }
    return state.loadImage(image);
  },
  deleteImage: (image) => {
    set((draft) => {
      draft.imageMap.delete(image.id);
      draft.imageDataCache.delete(image.dataSource);
    });
  },
});

const initialImageSliceState: ImageSliceState = {
  // TODO remove test data
  imageMap: new Map<string, IImageModel>([
    [
      "he",
      {
        id: "he",
        name: "H&E",
        dataSource: {
          type: "default",
          url: "/data/breast/TissueA_HnE.dzi",
        } as IDefaultImageDataSourceModel,
        layerConfigs: [{ layerId: "breast" }],
      },
    ],
    [
      "dapi",
      {
        id: "dapi",
        name: "DAPI",
        dataSource: {
          type: "default",
          url: "/data/breast/TissueA_Fluo.dzi",
        } as IDefaultImageDataSourceModel,
        layerConfigs: [{ layerId: "breast" }],
      },
    ],
  ]),
  imageDataCache: new Map<IImageDataSourceModel, IImageData>(),
  imageDataLoaderFactories: new Map<string, ImageDataLoaderFactory>([
    [
      DEFAULT_IMAGE_DATA_SOURCE,
      (dataSource, projectDir) =>
        new DefaultImageDataLoader(
          dataSource as IDefaultImageDataSourceModel,
          projectDir,
        ),
    ],
  ]),
};
