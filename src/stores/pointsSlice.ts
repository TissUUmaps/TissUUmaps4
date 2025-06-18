import { IPointsModel } from "../models/points";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type PointsSlice = PointsSliceState & PointsSliceActions;

export type PointsSliceState = {
  points: Map<string, IPointsModel>;
};

export type PointsSliceActions = {
  setPoints: (
    pointsId: string,
    points: IPointsModel,
    pointsIndex?: number,
  ) => void;
  deletePoints: (pointsId: string) => void;
};

export const createPointsSlice: BoundStoreStateCreator<PointsSlice> = (
  set,
) => ({
  ...initialPointsSliceState,
  setPoints: (pointsId, points, pointsIndex) =>
    set((draft) => {
      draft.points = MapUtils.cloneAndSet(
        draft.points,
        pointsId,
        points,
        pointsIndex,
      );
    }),
  deletePoints: (pointsId) => set((draft) => draft.points.delete(pointsId)),
});

const initialPointsSliceState: PointsSliceState = {
  points: new Map<string, IPointsModel>(),
};
