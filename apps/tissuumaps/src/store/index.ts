import {
  type StateCreator,
  type StoreApi,
  type UseBoundStore,
  create,
} from "zustand";
import { immer } from "zustand/middleware/immer";

import { type AppSlice, createAppSlice } from "./slices/app";
import { type ImageSlice, createImageSlice } from "./slices/image";
import { type LabelsSlice, createLabelsSlice } from "./slices/labels";
import { type LayerSlice, createLayerSlice } from "./slices/layer";
import { type PointsSlice, createPointsSlice } from "./slices/points";
import { type ProjectSlice, createProjectSlice } from "./slices/project";
import { type ShapesSlice, createShapesSlice } from "./slices/shapes";
import { type TableSlice, createTableSlice } from "./slices/table";

export type TissUUmapsStateCreator<T> = StateCreator<
  TissUUmapsState,
  [["zustand/immer", never]],
  [],
  T
>;

export type TissUUmapsState = AppSlice &
  ProjectSlice &
  LayerSlice &
  ImageSlice &
  LabelsSlice &
  PointsSlice &
  ShapesSlice &
  TableSlice;

export const useTissUUmaps: UseBoundStore<StoreApi<TissUUmapsState>> =
  create<TissUUmapsState>()(
    immer((...a) => ({
      ...createAppSlice(...a),
      ...createProjectSlice(...a),
      ...createLayerSlice(...a),
      ...createImageSlice(...a),
      ...createLabelsSlice(...a),
      ...createPointsSlice(...a),
      ...createShapesSlice(...a),
      ...createTableSlice(...a),
    })),
  );
