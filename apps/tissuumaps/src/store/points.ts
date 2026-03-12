import { deepEqual } from "fast-equals";

import {
  type Points,
  type PointsData,
  type PointsDataLoader,
  type PointsDataSource,
} from "@tissuumaps/core";

import { loadTableDataProxy } from "../proxies/TableDataProxy";
import { type TissUUmapsStateCreator } from "./index";

export type LoadedPoints = {
  data: PointsData;
  loadedDimensions: Map<string, LoadedPointsDimension>;
};

export type LoadedPointsDimension = {
  coordinates: Float32Array;
};

export type PointsSlice = PointsSliceState & PointsSliceActions;

export type PointsSliceState = {
  points: Points[];
  loadedPoints: Map<string, LoadedPoints>;
  pointsDataSourceCaches: { dataSource: PointsDataSource; data: PointsData }[];
};

export type PointsSliceActions = {
  addPoints: (points: Points, index?: number) => void;
  updatePoints: (pointsId: string, updates: Partial<Points>) => void;
  movePoints: (pointsId: string, newIndex: number) => void;
  deletePoints: (pointsId: string) => void;
  clearPoints: () => void;
  createPointsDataLoader: (pointsId: string) => PointsDataLoader<PointsData>;
  loadPoints: (
    pointsId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedPoints>;
  loadPointsDimension: (
    pointsId: string,
    dimension: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedPointsDimension>;
  unloadPointsDimension: (pointsId: string, dimension: string) => void;
  unloadPoints: (pointsId: string) => void;
};

export const createPointsSlice: TissUUmapsStateCreator<PointsSlice> = (
  set,
  get,
) => ({
  ...initialPointsSliceState,
  addPoints: (points, index) => {
    const state = get();
    if (state.points.some((x) => x.id === points.id)) {
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
  createPointsDataLoader: (pointsId) => {
    const state = get();
    const points = state.points.find((points) => points.id === pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
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
      state.workspace,
      (tableId, options) =>
        loadTableDataProxy(
          tableId,
          state.loadTable,
          state.loadTableColumn,
          options,
        ),
    );
    return dataLoader;
  },
  loadPoints: async (pointsId, options) => {
    const { signal, reload = false } = options ?? {};
    signal?.throwIfAborted();
    const state = get();
    const loadedPoints = state.loadedPoints.get(pointsId);
    if (loadedPoints !== undefined && !reload) {
      return loadedPoints;
    }
    const points = state.points.find((points) => points.id === pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    let data;
    const dataSourceCache = state.pointsDataSourceCaches.find(
      ({ dataSource }) => deepEqual(dataSource, points.dataSource),
    );
    if (dataSourceCache !== undefined) {
      data = dataSourceCache.data;
    } else {
      const dataLoader = state.createPointsDataLoader(pointsId);
      const newData = await dataLoader.loadPoints({ signal });
      signal?.throwIfAborted();
      set((draft) => {
        draft.pointsDataSourceCaches.push({
          dataSource: points.dataSource,
          data: newData,
        });
      });
      data = newData;
    }
    const newLoadedPoints = { data, loadedDimensions: new Map() };
    set((draft) => {
      draft.loadedPoints.set(pointsId, newLoadedPoints);
    });
    return newLoadedPoints;
  },
  loadPointsDimension: async (pointsId, dimension, options) => {
    const { signal, reload = false } = options ?? {};
    signal?.throwIfAborted();
    const state = get();
    const loadedPoints = await state.loadPoints(pointsId, { signal });
    signal?.throwIfAborted();
    const loadedDimension = loadedPoints.loadedDimensions.get(dimension);
    if (loadedDimension !== undefined && !reload) {
      return loadedDimension;
    }
    const coordinates = await loadedPoints.data.loadCoordinates(dimension, {
      signal,
    });
    signal?.throwIfAborted();
    const newLoadedDimension = { coordinates };
    set((draft) => {
      const loadedPoints = draft.loadedPoints.get(pointsId)!;
      loadedPoints.loadedDimensions.set(dimension, newLoadedDimension);
    });
    return newLoadedDimension;
  },
  unloadPointsDimension: (pointsId, dimension) => {
    set((draft) => {
      const loadedPoints = draft.loadedPoints.get(pointsId);
      if (loadedPoints === undefined) {
        throw new Error(`Points with ID ${pointsId} not loaded.`);
      }
      loadedPoints.loadedDimensions.delete(dimension);
    });
  },
  unloadPoints: (pointsId) => {
    const state = get();
    const loadedPoints = state.loadedPoints.get(pointsId);
    if (loadedPoints !== undefined) {
      let destroy = true;
      for (const other of state.loadedPoints.values()) {
        if (other !== loadedPoints && other.data === loadedPoints.data) {
          destroy = false;
          break;
        }
      }
      set((draft) => {
        draft.loadedPoints.delete(pointsId);
        if (destroy) {
          draft.pointsDataSourceCaches = draft.pointsDataSourceCaches.filter(
            (dataSourceCache) => dataSourceCache.data !== loadedPoints.data,
          );
        }
      });
      if (destroy) {
        loadedPoints.data.destroy();
      }
    }
  },
});

const initialPointsSliceState: PointsSliceState = {
  points: [],
  loadedPoints: new Map(),
  pointsDataSourceCaches: [],
};
