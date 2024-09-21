import {
  ImageReader,
  ImageReaderFactory,
  ImageReaderOptions,
} from "../model/image";
import {
  PointsReader,
  PointsReaderFactory,
  PointsReaderOptions,
} from "../model/points";
import {
  ShapesReader,
  ShapesReaderFactory,
  ShapesReaderOptions,
} from "../model/shapes";
import { SharedStoreSliceCreator } from "./sharedStore";

export type AppState = {
  initialized: boolean;
  imageReaderFactories: Map<string, ImageReaderFactory>;
  pointsReaderFactories: Map<string, PointsReaderFactory>;
  shapesReaderFactories: Map<string, ShapesReaderFactory>;
};

export type AppActions = {
  setInitialized: (initialized: boolean) => void;
  registerImageReader: (type: string, factory: ImageReaderFactory) => void;
  registerPointsReader: (type: string, factory: PointsReaderFactory) => void;
  registerShapesReader: (type: string, factory: ShapesReaderFactory) => void;
  unregisterImageReader: (type: string) => void;
  unregisterPointsReader: (type: string) => void;
  unregisterShapesReader: (type: string) => void;
  getImageReader: (
    options: ImageReaderOptions<string>,
  ) => ImageReader | undefined;
  getPointsReader: (
    options: PointsReaderOptions<string>,
  ) => PointsReader | undefined;
  getShapesReader: (
    options: ShapesReaderOptions<string>,
  ) => ShapesReader | undefined;
};

export type AppSlice = AppState & AppActions;

const initialAppState: AppState = {
  initialized: false,
  imageReaderFactories: new Map(),
  pointsReaderFactories: new Map(),
  shapesReaderFactories: new Map(),
};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = (
  set,
  get,
) => ({
  ...initialAppState,
  setInitialized: (initialized) => set({ initialized: initialized }),
  registerImageReader: (type, factory) =>
    set((draft) => {
      if (draft.imageReaderFactories.has(type)) {
        console.warn(`Image reader already registered: ${type}`);
      }
      draft.imageReaderFactories.set(type, factory);
    }),
  registerPointsReader: (type, factory) =>
    set((draft) => {
      if (draft.pointsReaderFactories.has(type)) {
        console.warn(`Points reader already registered: ${type}`);
      }
      draft.pointsReaderFactories.set(type, factory);
    }),
  registerShapesReader: (type, factory) =>
    set((draft) => {
      if (draft.shapesReaderFactories.has(type)) {
        console.warn(`Shapes reader already registered: ${type}`);
      }
      draft.shapesReaderFactories.set(type, factory);
    }),
  unregisterImageReader: (type) =>
    set((draft) => {
      draft.imageReaderFactories.delete(type);
    }),
  unregisterPointsReader: (type) =>
    set((draft) => {
      draft.pointsReaderFactories.delete(type);
    }),
  unregisterShapesReader: (type) =>
    set((draft) => {
      draft.shapesReaderFactories.delete(type);
    }),
  getImageReader: (options) => {
    const factory = get().imageReaderFactories.get(options.type);
    if (factory) {
      return factory(options);
    }
  },
  getPointsReader: (options) => {
    const factory = get().pointsReaderFactories.get(options.type);
    if (factory) {
      return factory(options);
    }
  },
  getShapesReader: (options) => {
    const factory = get().shapesReaderFactories.get(options.type);
    if (factory) {
      return factory(options);
    }
  },
});
