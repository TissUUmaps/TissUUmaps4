import { IShapesModel } from "../models/shapes";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type ShapesSlice = ShapesSliceState & ShapesSliceActions;

export type ShapesSliceState = {
  shapes: Map<string, IShapesModel>;
};

export type ShapesSliceActions = {
  setShapes: (
    shapesId: string,
    shapes: IShapesModel,
    shapesIndex?: number,
  ) => void;
  deleteShapes: (shapesId: string) => void;
};

export const createShapesSlice: BoundStoreStateCreator<ShapesSlice> = (
  set,
) => ({
  ...initialShapesSliceState,
  setShapes: (shapesId, shapes, shapesIndex) =>
    set((draft) => {
      draft.shapes = MapUtils.cloneAndSet(
        draft.shapes,
        shapesId,
        shapes,
        shapesIndex,
      );
    }),
  deleteShapes: (shapesId) => set((draft) => draft.shapes.delete(shapesId)),
});

const initialShapesSliceState: ShapesSliceState = {
  shapes: new Map<string, IShapesModel>(),
};
