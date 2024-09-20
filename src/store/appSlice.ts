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
  imageReaderFactories: Map<string, ImageReaderFactory>;
  pointsReaderFactories: Map<string, PointsReaderFactory>;
  shapesReaderFactories: Map<string, ShapesReaderFactory>;
};

export type AppActions = {
  registerImageReader: (type: string, factory: ImageReaderFactory) => void;
  registerPointsReader: (type: string, factory: PointsReaderFactory) => void;
  registerShapesReader: (type: string, factory: ShapesReaderFactory) => void;
  createImageReader: (
    type: string,
    options: ImageReaderOptions,
  ) => ImageReader | undefined;
  createPointsReader: (
    type: string,
    options: PointsReaderOptions,
  ) => PointsReader | undefined;
  createShapesReader: (
    type: string,
    options: ShapesReaderOptions,
  ) => ShapesReader | undefined;
};

export type AppSlice = AppState & AppActions;

const initialAppState: AppState = {
  imageReaderFactories: new Map(),
  pointsReaderFactories: new Map(),
  shapesReaderFactories: new Map(),
};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = (
  set,
  get,
) => ({
  ...initialAppState,
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
  createImageReader: (type, options) => {
    const factory = get().imageReaderFactories.get(type);
    if (!factory) {
      return undefined;
    }
    return factory(options);
  },
  createPointsReader: (type, options) => {
    const factory = get().pointsReaderFactories.get(type);
    if (!factory) {
      return undefined;
    }
    return factory(options);
  },
  createShapesReader: (type, options) => {
    const factory = get().shapesReaderFactories.get(type);
    if (!factory) {
      return undefined;
    }
    return factory(options);
  },
});
