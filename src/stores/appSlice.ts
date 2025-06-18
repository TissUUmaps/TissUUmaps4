// import {
//   IImageDataSource,
//   ILabelsDataSource,
//   IPointsDataSource,
//   IShapesDataSource,
//   ITableDataSource,
// } from "../../archive/datasources/base";
// import { IImageDataSourceModel } from "../models/image";
// import { ILabelsDataSourceModel } from "../models/labels";
// import { IPointsDataSourceModel } from "../models/points";
// import { IShapesDataSourceModel } from "../models/shapes";
// import { ITableDataSourceModel } from "../models/table";
import { SharedStoreSliceCreator } from "./sharedStore";

// type ImageDataSourceFactory = (
//   config: IImageDataSourceModel<string>,
// ) => IImageDataSource<IImageDataSourceModel<string>> | undefined;
// type LabelsDataSourceFactory = (
//   config: ILabelsDataSourceModel<string>,
// ) => ILabelsDataSource<ILabelsDataSourceModel<string>> | undefined;
// type PointsDataSourceFactory = (
//   config: IPointsDataSourceModel<string>,
// ) => IPointsDataSource<IPointsDataSourceModel<string>> | undefined;
// type ShapesDataSourceFactory = (
//   config: IShapesDataSourceModel<string>,
// ) => IShapesDataSource<IShapesDataSourceModel<string>> | undefined;
// type TableDataSourceFactory = (
//   config: ITableDataSourceModel<string>,
// ) => ITableDataSource<ITableDataSourceModel<string>> | undefined;

export type AppSlice = AppState & AppActions;

export type AppState = {
  initialized: boolean;
  // imageDataSourceFactories: Map<string, ImageDataSourceFactory>;
  // labelsDataSourceFactories: Map<string, LabelsDataSourceFactory>;
  // pointsDataSourceFactories: Map<string, PointsDataSourceFactory>;
  // shapesDataSourceFactories: Map<string, ShapesDataSourceFactory>;
  // tableDataSourceFactories: Map<string, TableDataSourceFactory>;
};

export type AppActions = {
  setInitialized: (initialized: boolean) => void;
  // registerImageDataSource: (type: string, f: ImageDataSourceFactory) => void;
  // registerLabelsDataSource: (type: string, f: LabelsDataSourceFactory) => void;
  // registerPointsDataSource: (type: string, f: PointsDataSourceFactory) => void;
  // registerShapesDataSource: (type: string, f: ShapesDataSourceFactory) => void;
  // registerTableDataSource: (type: string, f: TableDataSourceFactory) => void;
  // deregisterImageDataSource: (type: string) => void;
  // deregisterLabelsDataSource: (type: string) => void;
  // deregisterPointsDataSource: (type: string) => void;
  // deregisterShapesDataSource: (type: string) => void;
  // deregisterTableDataSource: (type: string) => void;
  // createImageDataSource: ImageDataSourceFactory;
  // createLabelsDataSource: LabelsDataSourceFactory;
  // createPointsDataSource: PointsDataSourceFactory;
  // createShapesDataSource: ShapesDataSourceFactory;
  // createTableDataSource: TableDataSourceFactory;
};

export const createAppSlice: SharedStoreSliceCreator<AppSlice> = (
  set,
  // get,
) => ({
  ...initialAppState,
  setInitialized: (initialized) => set({ initialized: initialized }),
  // registerImageDataSource: (type, f) =>
  //   set((draft) => {
  //     if (draft.imageDataSourceFactories.has(type)) {
  //       console.warn(`Image data source already registered: ${type}`);
  //     }
  //     draft.imageDataSourceFactories.set(type, f);
  //   }),
  // registerLabelsDataSource: (type, f) =>
  //   set((draft) => {
  //     if (draft.labelsDataSourceFactories.has(type)) {
  //       console.warn(`Labels data source already registered: ${type}`);
  //     }
  //     draft.labelsDataSourceFactories.set(type, f);
  //   }),
  // registerPointsDataSource: (type, f) =>
  //   set((draft) => {
  //     if (draft.pointsDataSourceFactories.has(type)) {
  //       console.warn(`Points data source already registered: ${type}`);
  //     }
  //     draft.pointsDataSourceFactories.set(type, f);
  //   }),
  // registerShapesDataSource: (type, f) =>
  //   set((draft) => {
  //     if (draft.shapesDataSourceFactories.has(type)) {
  //       console.warn(`Shapes data source already registered: ${type}`);
  //     }
  //     draft.shapesDataSourceFactories.set(type, f);
  //   }),
  // registerTableDataSource: (type, f) =>
  //   set((draft) => {
  //     if (draft.tableDataSourceFactories.has(type)) {
  //       console.warn(`Table data source already registered: ${type}`);
  //     }
  //     draft.tableDataSourceFactories.set(type, f);
  //   }),
  // deregisterImageDataSource: (type) =>
  //   set((draft) => {
  //     if (!draft.imageDataSourceFactories.has(type)) {
  //       console.warn(`Image data source not registered: ${type}`);
  //     }
  //     draft.imageDataSourceFactories.delete(type);
  //   }),
  // deregisterLabelsDataSource: (type) =>
  //   set((draft) => {
  //     if (!draft.labelsDataSourceFactories.has(type)) {
  //       console.warn(`Labels data source not registered: ${type}`);
  //     }
  //     draft.labelsDataSourceFactories.delete(type);
  //   }),
  // deregisterPointsDataSource: (type) =>
  //   set((draft) => {
  //     if (!draft.pointsDataSourceFactories.has(type)) {
  //       console.warn(`Points data source not registered: ${type}`);
  //     }
  //     draft.pointsDataSourceFactories.delete(type);
  //   }),
  // deregisterShapesDataSource: (type) =>
  //   set((draft) => {
  //     if (!draft.shapesDataSourceFactories.has(type)) {
  //       console.warn(`Shapes data source not registered: ${type}`);
  //     }
  //     draft.shapesDataSourceFactories.delete(type);
  //   }),
  // deregisterTableDataSource: (type) =>
  //   set((draft) => {
  //     if (!draft.tableDataSourceFactories.has(type)) {
  //       console.warn(`Table data source not registered: ${type}`);
  //     }
  //     draft.tableDataSourceFactories.delete(type);
  //   }),
  // createImageDataSource: (config) => {
  //   const f = get().imageDataSourceFactories.get(config.type);
  //   if (f) {
  //     return f(config);
  //   }
  // },
  // createLabelsDataSource: (config) => {
  //   const f = get().labelsDataSourceFactories.get(config.type);
  //   if (f) {
  //     return f(config);
  //   }
  // },
  // createPointsDataSource: (config) => {
  //   const f = get().pointsDataSourceFactories.get(config.type);
  //   if (f) {
  //     return f(config);
  //   }
  // },
  // createShapesDataSource: (config) => {
  //   const f = get().shapesDataSourceFactories.get(config.type);
  //   if (f) {
  //     return f(config);
  //   }
  // },
  // createTableDataSource: (config) => {
  //   const f = get().tableDataSourceFactories.get(config.type);
  //   if (f) {
  //     return f(config);
  //   }
  // },
});

const initialAppState: AppState = {
  initialized: false,
  // imageDataSourceFactories: new Map(),
  // labelsDataSourceFactories: new Map(),
  // pointsDataSourceFactories: new Map(),
  // shapesDataSourceFactories: new Map(),
  // tableDataSourceFactories: new Map(),
};
