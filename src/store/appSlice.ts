import { SharedStoreSliceCreator } from "./sharedStore";

export type AppState = {
  osd: {
    [layerId: string]: {
      dummyTiledImageIndex: number;
      dirty: boolean;
      images: {
        [imageId: string]: { tiledImageIndex: number; dirty: boolean };
      };
    };
  };
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type AppActions = {};

export type AppSlice = AppState & AppActions;

const initialAppState: AppState = {
  osd: {},
};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = () => ({
  ...initialAppState,
});
