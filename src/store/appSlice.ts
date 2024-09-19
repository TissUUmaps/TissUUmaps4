import { ViewerState } from "../utils/OpenSeadragonUtils";
import { SharedStoreSliceCreator } from "./sharedStore";

export type AppState = {
  viewerState: ViewerState;
};

export type AppActions = {
  setViewerState: (viewerState: ViewerState) => void;
};

export type AppSlice = AppState & AppActions;

const initialAppState: AppState = {
  viewerState: { layers: {} },
};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = (set) => ({
  ...initialAppState,
  setViewerState: (viewerState) => set({ viewerState: viewerState }),
});
