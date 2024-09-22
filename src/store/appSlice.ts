import ImageReader, { ImageReaderOptions } from "../readers/ImageReader";
import PointsReader, { PointsReaderOptions } from "../readers/PointsReader";
import ShapesReader, { ShapesReaderOptions } from "../readers/ShapesReader";
import { SharedStoreSliceCreator } from "./sharedStore";

type ImageReaderFactory<T extends string> = (
  options: ImageReaderOptions<T>,
) => ImageReader;
type PointsReaderFactory<T extends string> = (
  options: PointsReaderOptions<T>,
) => PointsReader;
type ShapesReaderFactory<T extends string> = (
  options: ShapesReaderOptions<T>,
) => ShapesReader;

export type AppState = {
  initialized: boolean;
  imageReaderFactories: Map<string, ImageReaderFactory<string>>;
  pointsReaderFactories: Map<string, PointsReaderFactory<string>>;
  shapesReaderFactories: Map<string, ShapesReaderFactory<string>>;
};

export type AppActions = {
  setInitialized: (initialized: boolean) => void;
  registerImageReader: (
    type: string,
    factory: ImageReaderFactory<string>,
  ) => void;
  registerPointsReader: (
    type: string,
    factory: PointsReaderFactory<string>,
  ) => void;
  registerShapesReader: (
    type: string,
    factory: ShapesReaderFactory<string>,
  ) => void;
  unregisterImageReader: (type: string) => void;
  unregisterPointsReader: (type: string) => void;
  unregisterShapesReader: (type: string) => void;
  createImageReader: (
    options: ImageReaderOptions<string>,
  ) => ImageReader | undefined;
  createPointsReader: (
    options: PointsReaderOptions<string>,
  ) => PointsReader | undefined;
  createShapesReader: (
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
  createImageReader: (options) => {
    const factory = get().imageReaderFactories.get(options.type);
    if (factory) {
      return factory(options);
    }
  },
  createPointsReader: (options) => {
    const factory = get().pointsReaderFactories.get(options.type);
    if (factory) {
      return factory(options);
    }
  },
  createShapesReader: (options) => {
    const factory = get().shapesReaderFactories.get(options.type);
    if (factory) {
      return factory(options);
    }
  },
});
