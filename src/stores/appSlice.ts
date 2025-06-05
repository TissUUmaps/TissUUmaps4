import {
  ImageSourceBase,
  LabelsSourceBase,
  PointsSourceBase,
  ShapesSourceBase,
} from "../datasources/base";
import { ImageSourceModel } from "../models/image";
import { LabelsSourceModel } from "../models/labels";
import { PointsSourceModel } from "../models/points";
import { ShapesSourceModel } from "../models/shapes";
import { SharedStoreSliceCreator } from "./sharedStore";

type ImageSourceFactory = (
  config: ImageSourceModel<string>,
) => ImageSourceBase<ImageSourceModel<string>> | undefined;
type LabelsSourceFactory = (
  config: LabelsSourceModel<string>,
) => LabelsSourceBase<LabelsSourceModel<string>> | undefined;
type PointsSourceFactory = (
  config: PointsSourceModel<string>,
) => PointsSourceBase<PointsSourceModel<string>> | undefined;
type ShapesSourceFactory = (
  config: ShapesSourceModel<string>,
) => ShapesSourceBase<ShapesSourceModel<string>> | undefined;

export type AppSlice = AppState & AppActions;

export type AppState = {
  initialized: boolean;
  imageSourceFactories: Map<string, ImageSourceFactory>;
  labelsSourceFactories: Map<string, LabelsSourceFactory>;
  pointsSourceFactories: Map<string, PointsSourceFactory>;
  shapesSourceFactories: Map<string, ShapesSourceFactory>;
};

export type AppActions = {
  setInitialized: (initialized: boolean) => void;
  registerImageSource: (type: string, f: ImageSourceFactory) => void;
  registerLabelsSource: (type: string, f: LabelsSourceFactory) => void;
  registerPointsSource: (type: string, f: PointsSourceFactory) => void;
  registerShapesSource: (type: string, f: ShapesSourceFactory) => void;
  createImageSource: ImageSourceFactory;
  createLabelsSource: LabelsSourceFactory;
  createPointsSource: PointsSourceFactory;
  createShapesSource: ShapesSourceFactory;
};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = (
  set,
  get,
) => ({
  ...initialAppState,
  setInitialized: (initialized) => set({ initialized: initialized }),
  registerImageSource: (type, f) =>
    set((draft) => {
      if (draft.imageSourceFactories.has(type)) {
        console.warn(`Image data source already registered: ${type}`);
      }
      draft.imageSourceFactories.set(type, f);
    }),
  registerLabelsSource: (type, f) =>
    set((draft) => {
      if (draft.labelsSourceFactories.has(type)) {
        console.warn(`Labels data source already registered: ${type}`);
      }
      draft.labelsSourceFactories.set(type, f);
    }),
  registerPointsSource: (type, f) =>
    set((draft) => {
      if (draft.pointsSourceFactories.has(type)) {
        console.warn(`Points data source already registered: ${type}`);
      }
      draft.pointsSourceFactories.set(type, f);
    }),
  registerShapesSource: (type, f) =>
    set((draft) => {
      if (draft.shapesSourceFactories.has(type)) {
        console.warn(`Shapes data source already registered: ${type}`);
      }
      draft.shapesSourceFactories.set(type, f);
    }),
  createImageSource: (config) => {
    const f = get().imageSourceFactories.get(config.type);
    if (f) {
      return f(config);
    }
  },
  createLabelsSource: (config) => {
    const f = get().labelsSourceFactories.get(config.type);
    if (f) {
      return f(config);
    }
  },
  createPointsSource: (config) => {
    const f = get().pointsSourceFactories.get(config.type);
    if (f) {
      return f(config);
    }
  },
  createShapesSource: (config) => {
    const f = get().shapesSourceFactories.get(config.type);
    if (f) {
      return f(config);
    }
  },
});

const initialAppState: AppState = {
  initialized: false,
  imageSourceFactories: new Map(),
  labelsSourceFactories: new Map(),
  pointsSourceFactories: new Map(),
  shapesSourceFactories: new Map(),
};
