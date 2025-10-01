import { StateCreator, create } from "zustand";
import { immer } from "zustand/middleware/immer";

import { AppSlice, createAppSlice } from "./appSlice";
import { ImageSlice, createImageSlice } from "./imageSlice";
import { LabelsSlice, createLabelsSlice } from "./labelsSlice";
import { LayerSlice, createLayerSlice } from "./layerSlice";
import { PointsSlice, createPointsSlice } from "./pointsSlice";
import { ProjectSlice, createProjectSlice } from "./projectSlice";
import { ShapesSlice, createShapesSlice } from "./shapesSlice";
import { TableSlice, createTableSlice } from "./tableSlice";

export type BoundStoreStateCreator<T> = StateCreator<
  BoundStore,
  [["zustand/immer", never]],
  [],
  T
>;

export type BoundStore = AppSlice &
  ProjectSlice &
  LayerSlice &
  ImageSlice &
  LabelsSlice &
  PointsSlice &
  ShapesSlice &
  TableSlice;

export const useBoundStore = create<BoundStore>()(
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
