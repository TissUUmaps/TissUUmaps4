import { PointsData } from "../data/points";
import { CompletePoints, CompletePointsDataSource } from "../model/points";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type PointsSlice = PointsSliceState & PointsSliceActions;

export type PointsSliceState = {
  pointsMap: Map<string, CompletePoints>;
  pointsDataCache: Map<CompletePointsDataSource, PointsData>;
};

export type PointsSliceActions = {
  addPoints: (points: CompletePoints, index?: number) => void;
  loadPoints: (
    points: CompletePoints,
    signal?: AbortSignal,
  ) => Promise<PointsData>;
  loadPointsByID: (
    pointsId: string,
    signal?: AbortSignal,
  ) => Promise<PointsData>;
  unloadPoints: (points: CompletePoints) => void;
  unloadPointsByID: (pointsId: string) => void;
  deletePoints: (points: CompletePoints) => void;
  deletePointsByID: (pointsId: string) => void;
  clearPoints: () => void;
};

export const createPointsSlice: BoundStoreStateCreator<PointsSlice> = (
  set,
  get,
) => ({
  ...initialPointsSliceState,
  addPoints: (points, index) => {
    const state = get();
    const oldPoints = state.pointsMap.get(points.id);
    if (oldPoints !== undefined) {
      state.unloadPoints(oldPoints);
    }
    set((draft) => {
      draft.pointsMap = MapUtils.cloneAndSpliceSet(
        draft.pointsMap,
        points.id,
        points,
        index,
      );
    });
  },
  loadPoints: async (points, signal) => {
    signal?.throwIfAborted();
    const state = get();
    let pointsData = state.pointsDataCache.get(points.dataSource);
    if (pointsData !== undefined) {
      return pointsData;
    }
    const pointsDataLoaderFactory = state.pointsDataLoaderFactories.get(
      points.dataSource.type,
    );
    if (pointsDataLoaderFactory === undefined) {
      throw new Error(
        `No points data loader found for type ${points.dataSource.type}.`,
      );
    }
    const pointsDataLoader = pointsDataLoaderFactory(
      points.dataSource,
      state.projectDir,
      state.loadTableByID,
    );
    pointsData = await pointsDataLoader.loadPoints(signal);
    signal?.throwIfAborted();
    set((draft) => {
      draft.pointsDataCache.set(points.dataSource, pointsData);
    });
    return pointsData;
  },
  loadPointsByID: async (pointsId, signal) => {
    signal?.throwIfAborted();
    const state = get();
    const points = state.pointsMap.get(pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    return state.loadPoints(points, signal);
  },
  unloadPoints: (points) => {
    const state = get();
    const pointsData = state.pointsDataCache.get(points.dataSource);
    set((draft) => {
      draft.pointsDataCache.delete(points.dataSource);
    });
    pointsData?.destroy();
  },
  unloadPointsByID: (pointsId) => {
    const state = get();
    const points = state.pointsMap.get(pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    state.unloadPoints(points);
  },
  deletePoints: (points) => {
    const state = get();
    state.unloadPoints(points);
    set((draft) => {
      draft.pointsMap.delete(points.id);
    });
  },
  deletePointsByID: (pointsId) => {
    const state = get();
    const points = state.pointsMap.get(pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    state.deletePoints(points);
  },
  clearPoints: () => {
    const state = get();
    state.pointsMap.forEach((points) => {
      state.deletePoints(points);
    });
    set(initialPointsSliceState);
  },
});

const initialPointsSliceState: PointsSliceState = {
  pointsMap: new Map(),
  pointsDataCache: new Map(),
};
