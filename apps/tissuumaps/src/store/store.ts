import { type StateCreator, create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { type AppSlice, createAppSlice } from "./appSlice";
import { type ImageSlice, createImageSlice } from "./imageSlice";
import { type LabelsSlice, createLabelsSlice } from "./labelsSlice";
import { type LayerSlice, createLayerSlice } from "./layerSlice";
import { type PointsSlice, createPointsSlice } from "./pointsSlice";
import { type ProjectSlice, createProjectSlice } from "./projectSlice";
import { type ShapesSlice, createShapesSlice } from "./shapesSlice";
import { type TableSlice, createTableSlice } from "./tableSlice";

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
