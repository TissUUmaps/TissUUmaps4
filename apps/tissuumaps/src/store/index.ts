import { type StateCreator, create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { type AppSlice, createAppSlice } from "./app";
import { type ImageSlice, createImageSlice } from "./image";
import { type LabelsSlice, createLabelsSlice } from "./labels";
import { type LayerSlice, createLayerSlice } from "./layer";
import { type PointsSlice, createPointsSlice } from "./points";
import { type ProjectSlice, createProjectSlice } from "./project";
import { type ShapesSlice, createShapesSlice } from "./shapes";
import { type TableSlice, createTableSlice } from "./table";

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

export const useTissUUmaps = create<TissUUmapsState>()(
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
