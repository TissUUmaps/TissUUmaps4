import {
  ImageDataSourceBase,
  LabelsDataSourceBase,
  PointsDataSourceBase,
  ShapesDataSourceBase,
} from "../datasources/base";
import { ImageDataSourceModel } from "../models/image";
import { LabelsDataSourceModel } from "../models/labels";
import { PointsDataSourceModel } from "../models/points";
import { ShapesDataSourceModel } from "../models/shapes";
import { SharedStoreSliceCreator } from "./sharedStore";

type ImageDataSourceFactory = (
  config: ImageDataSourceModel<string>,
) => ImageDataSourceBase<ImageDataSourceModel<string>> | undefined;
type LabelsDataSourceFactory = (
  config: LabelsDataSourceModel<string>,
) => LabelsDataSourceBase<LabelsDataSourceModel<string>> | undefined;
type PointsDataSourceFactory = (
  config: PointsDataSourceModel<string>,
) => PointsDataSourceBase<PointsDataSourceModel<string>> | undefined;
type ShapesDataSourceFactory = (
  config: ShapesDataSourceModel<string>,
) => ShapesDataSourceBase<ShapesDataSourceModel<string>> | undefined;

export type AppSlice = AppState & AppActions;

export type AppState = {
  initialized: boolean;
  imageDataSourceFactories: Map<string, ImageDataSourceFactory>;
  labelsDataSourceFactories: Map<string, LabelsDataSourceFactory>;
  pointsDataSourceFactories: Map<string, PointsDataSourceFactory>;
  shapesDataSourceFactories: Map<string, ShapesDataSourceFactory>;
};

export type AppActions = {
  setInitialized: (initialized: boolean) => void;
  registerImageDataSource: (type: string, f: ImageDataSourceFactory) => void;
  registerLabelsDataSource: (type: string, f: LabelsDataSourceFactory) => void;
  registerPointsDataSource: (type: string, f: PointsDataSourceFactory) => void;
  registerShapesDataSource: (type: string, f: ShapesDataSourceFactory) => void;
  deregisterImageDataSource: (type: string) => void;
  deregisterLabelsDataSource: (type: string) => void;
  deregisterPointsDataSource: (type: string) => void;
  deregisterShapesDataSource: (type: string) => void;
  createImageDataSource: ImageDataSourceFactory;
  createLabelsDataSource: LabelsDataSourceFactory;
  createPointsDataSource: PointsDataSourceFactory;
  createShapesDataSource: ShapesDataSourceFactory;
};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = (
  set,
  get,
) => ({
  ...initialAppState,
  setInitialized: (initialized) => set({ initialized: initialized }),
  registerImageDataSource: (type, f) =>
    set((draft) => {
      if (draft.imageDataSourceFactories.has(type)) {
        console.warn(`Image data source already registered: ${type}`);
      }
      draft.imageDataSourceFactories.set(type, f);
    }),
  registerLabelsDataSource: (type, f) =>
    set((draft) => {
      if (draft.labelsDataSourceFactories.has(type)) {
        console.warn(`Labels data source already registered: ${type}`);
      }
      draft.labelsDataSourceFactories.set(type, f);
    }),
  registerPointsDataSource: (type, f) =>
    set((draft) => {
      if (draft.pointsDataSourceFactories.has(type)) {
        console.warn(`Points data source already registered: ${type}`);
      }
      draft.pointsDataSourceFactories.set(type, f);
    }),
  registerShapesDataSource: (type, f) =>
    set((draft) => {
      if (draft.shapesDataSourceFactories.has(type)) {
        console.warn(`Shapes data source already registered: ${type}`);
      }
      draft.shapesDataSourceFactories.set(type, f);
    }),
  deregisterImageDataSource: (type) =>
    set((draft) => {
      if (!draft.imageDataSourceFactories.has(type)) {
        console.warn(`Image data source not registered: ${type}`);
      }
      draft.imageDataSourceFactories.delete(type);
    }),
  deregisterLabelsDataSource: (type) =>
    set((draft) => {
      if (!draft.labelsDataSourceFactories.has(type)) {
        console.warn(`Labels data source not registered: ${type}`);
      }
      draft.labelsDataSourceFactories.delete(type);
    }),
  deregisterPointsDataSource: (type) =>
    set((draft) => {
      if (!draft.pointsDataSourceFactories.has(type)) {
        console.warn(`Points data source not registered: ${type}`);
      }
      draft.pointsDataSourceFactories.delete(type);
    }),
  deregisterShapesDataSource: (type) =>
    set((draft) => {
      if (!draft.shapesDataSourceFactories.has(type)) {
        console.warn(`Shapes data source not registered: ${type}`);
      }
      draft.shapesDataSourceFactories.delete(type);
    }),
  createImageDataSource: (config) => {
    const f = get().imageDataSourceFactories.get(config.type);
    if (f) {
      return f(config);
    }
  },
  createLabelsDataSource: (config) => {
    const f = get().labelsDataSourceFactories.get(config.type);
    if (f) {
      return f(config);
    }
  },
  createPointsDataSource: (config) => {
    const f = get().pointsDataSourceFactories.get(config.type);
    if (f) {
      return f(config);
    }
  },
  createShapesDataSource: (config) => {
    const f = get().shapesDataSourceFactories.get(config.type);
    if (f) {
      return f(config);
    }
  },
});

const initialAppState: AppState = {
  initialized: false,
  imageDataSourceFactories: new Map(),
  labelsDataSourceFactories: new Map(),
  pointsDataSourceFactories: new Map(),
  shapesDataSourceFactories: new Map(),
};
