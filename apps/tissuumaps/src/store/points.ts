import { deepEqual } from "fast-equals";

import {
  type Points,
  type PointsData,
  type PointsDataSource,
} from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "./index";

export type PointsSlice = PointsSliceState & PointsSliceActions;

export type PointsSliceState = {
  points: Points[];
  _pointsDataCache: { dataSource: PointsDataSource; data: PointsData }[];
};

export type PointsSliceActions = {
  addPoints: (points: Points, index?: number) => void;
  updatePoints: (pointsId: string, updates: Partial<Points>) => void;
  movePoints: (pointsId: string, newIndex: number) => void;
  deletePoints: (pointsId: string) => void;
  clearPoints: () => void;
  loadPoints: (
    pointsId: string,
    options: { signal?: AbortSignal },
  ) => Promise<PointsData>;
  unloadPoints: (pointsId: string) => void;
};

export const createPointsSlice: TissUUmapsStateCreator<PointsSlice> = (
  set,
  get,
) => ({
  ...initialPointsSliceState,
  addPoints: (points, index) => {
    const state = get();
    if (state.points.find((x) => x.id === points.id) !== undefined) {
      throw new Error(`Points with ID ${points.id} already exists.`);
    }
    set((draft) => {
      draft.points.splice(index ?? draft.points.length, 0, points);
    });
  },
  updatePoints: (pointsId, updates) => {
    const state = get();
    const index = state.points.findIndex((points) => points.id === pointsId);
    if (index === -1) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    set((draft) => {
      draft.points[index] = { ...draft.points[index]!, ...updates };
    });
  },
  movePoints: (pointsId, newIndex) => {
    const state = get();
    const oldIndex = state.points.findIndex((points) => points.id === pointsId);
    if (oldIndex === -1) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const [points] = draft.points.splice(oldIndex, 1);
        draft.points.splice(newIndex, 0, points!);
      });
    }
  },
  deletePoints: (pointsId) => {
    const state = get();
    const index = state.points.findIndex((points) => points.id === pointsId);
    if (index === -1) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    state.unloadPoints(pointsId);
    set((draft) => {
      draft.points.splice(index, 1);
    });
  },
  clearPoints: () => {
    const state = get();
    while (state.points.length > 0) {
      state.deletePoints(state.points[0]!.id);
    }
    set(initialPointsSliceState);
  },
  loadPoints: async (pointsId, { signal }: { signal?: AbortSignal } = {}) => {
    signal?.throwIfAborted();
    const state = get();
    const points = state.points.find((points) => points.id === pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    const cache = state._pointsDataCache.find(({ dataSource }) =>
      deepEqual(dataSource, points.dataSource),
    );
    if (cache !== undefined) {
      return cache.data;
    }
    const dataLoaderFactory = state.pointsDataLoaderFactories.get(
      points.dataSource.type,
    );
    if (dataLoaderFactory === undefined) {
      throw new Error(
        `No points data loader found for type ${points.dataSource.type}.`,
      );
    }
    const dataLoader = dataLoaderFactory(
      points.dataSource,
      state.projectDir,
      state.loadTable,
    );
    const data = await dataLoader.loadPoints({ signal });
    signal?.throwIfAborted();
    set((draft) => {
      draft._pointsDataCache.push({ dataSource: points.dataSource, data });
    });
    return data;
  },
  unloadPoints: (pointsId) => {
    const state = get();
    const points = state.points.find((points) => points.id === pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    const cacheIndex = state._pointsDataCache.findIndex(({ dataSource }) =>
      deepEqual(dataSource, points.dataSource),
    );
    if (cacheIndex !== -1) {
      const cache = state._pointsDataCache[cacheIndex]!;
      set((draft) => {
        draft._pointsDataCache.splice(cacheIndex, 1);
      });
      cache.data.destroy();
    }
  },
});

const initialPointsSliceState: PointsSliceState = {
  points: [],
  _pointsDataCache: [],
};
