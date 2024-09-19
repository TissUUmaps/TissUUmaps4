import { ImageProviderFactory } from "../model/image";
import { PointsProviderFactory } from "../model/points";
import { ShapesProviderFactory } from "../model/shapes";
import { ViewerState } from "../utils/OpenSeadragonUtils";
import { SharedStoreSliceCreator } from "./sharedStore";

export type AppState = {
  viewerState: ViewerState;
  imageProviderFactories: Map<string, ImageProviderFactory>;
  pointsProviderFactories: Map<string, PointsProviderFactory>;
  shapesProviderFactories: Map<string, ShapesProviderFactory>;
};

export type AppActions = {
  setViewerState: (viewerState: ViewerState) => void;
  registerImageProvider: (type: string, factory: ImageProviderFactory) => void;
  registerPointsProvider: (
    type: string,
    factory: PointsProviderFactory,
  ) => void;
  registerShapesProvider: (
    type: string,
    factory: ShapesProviderFactory,
  ) => void;
};

export type AppSlice = AppState & AppActions;

const initialAppState: AppState = {
  viewerState: { layers: {} },
  imageProviderFactories: new Map(),
  pointsProviderFactories: new Map(),
  shapesProviderFactories: new Map(),
};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = (set) => ({
  ...initialAppState,
  setViewerState: (viewerState) => set({ viewerState: viewerState }),
  registerImageProvider: (type, factory) =>
    set((draft) => {
      if (draft.imageProviderFactories.has(type)) {
        console.warn(`Image provider already registered: ${type}`);
      }
      draft.imageProviderFactories.set(type, factory);
    }),
  registerPointsProvider: (type, factory) =>
    set((draft) => {
      if (draft.pointsProviderFactories.has(type)) {
        console.warn(`Points provider already registered: ${type}`);
      }
      draft.pointsProviderFactories.set(type, factory);
    }),
  registerShapesProvider: (type, factory) =>
    set((draft) => {
      if (draft.shapesProviderFactories.has(type)) {
        console.warn(`Shapes provider already registered: ${type}`);
      }
      draft.shapesProviderFactories.set(type, factory);
    }),
});
