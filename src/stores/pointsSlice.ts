import { IPointsData, IPointsDataLoader } from "../data/points";
import { IPointsDataSourceModel, IPointsModel } from "../models/points";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type PointsSlice = PointsSliceState & PointsSliceActions;

export type PointsSliceState = {
  points: Map<string, IPointsModel>;
  pointsData: Map<string, IPointsData>;
  pointsDataLoaders: Map<
    string,
    IPointsDataLoader<IPointsDataSourceModel<string>>
  >;
};

export type PointsSliceActions = {
  setPoints: (
    pointsId: string,
    points: IPointsModel,
    pointsIndex?: number,
  ) => void;
  loadPoints: (pointsId: string, points?: IPointsModel) => Promise<IPointsData>;
  deletePoints: (pointsId: string) => void;
  registerPointsDataLoader: (
    pointsDataSourceType: string,
    pointsDataLoader: IPointsDataLoader<IPointsDataSourceModel<string>>,
  ) => void;
  unregisterPointsDataLoader: (pointsDataSourceType: string) => void;
};

export const createPointsSlice: BoundStoreStateCreator<PointsSlice> = (
  set,
  get,
) => ({
  ...initialPointsSliceState,
  setPoints: (pointsId, points, pointsIndex) => {
    set((draft) => {
      draft.points = MapUtils.cloneAndSet(
        draft.points,
        pointsId,
        points,
        pointsIndex,
      );
    });
  },
  loadPoints: async (pointsId, points) => {
    const state = get();
    if (state.pointsData.has(pointsId)) {
      return state.pointsData.get(pointsId)!;
    }
    if (points === undefined) {
      points = state.points.get(pointsId);
      if (points === undefined) {
        throw new Error(`No points found for ID: ${pointsId}`);
      }
    }
    const pointsDataLoader = state.pointsDataLoaders.get(
      points.dataSource.type,
    );
    if (pointsDataLoader === undefined) {
      throw new Error(
        `No points data loader registered for points data source type: ${points.dataSource.type}`,
      );
    }
    const pointsData = await pointsDataLoader.loadPoints(points.dataSource);
    set((draft) => {
      draft.pointsData.set(pointsId, pointsData);
    });
    return pointsData;
  },
  deletePoints: (pointsId) => {
    set((draft) => {
      draft.points.delete(pointsId);
      draft.pointsData.delete(pointsId);
    });
  },
  registerPointsDataLoader: (pointsDataSourceType, pointsDataLoader) => {
    set((draft) => {
      if (draft.pointsDataLoaders.has(pointsDataSourceType)) {
        console.warn(
          `Points data loader was already registered for points data source type: ${pointsDataSourceType}`,
        );
      }
      draft.pointsDataLoaders.set(pointsDataSourceType, pointsDataLoader);
    });
  },
  unregisterPointsDataLoader: (pointsDataSourceType) => {
    set((draft) => {
      if (!draft.pointsDataLoaders.delete(pointsDataSourceType)) {
        console.warn(
          `No points data loader registered for points data source type: ${pointsDataSourceType}`,
        );
      }
    });
  },
});

const initialPointsSliceState: PointsSliceState = {
  points: new Map<string, IPointsModel>(),
  pointsData: new Map<string, IPointsData>(),
  pointsDataLoaders: new Map<
    string,
    IPointsDataLoader<IPointsDataSourceModel<string>>
  >(),
};
