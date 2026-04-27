import { deepEqual } from "fast-equals";

import {
  type Points,
  type PointsData,
  type PointsDataSource,
  type ProgressCallback,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

type LoadedPointsData = {
  dataSource: PointsDataSource;
  data: PointsData;
  loadedCoordinates?: [Float32Array, Float32Array];
};

export type PointsSlice = PointsSliceState & PointsSliceActions;

export type PointsSliceState = {
  points: Points[];
  loadedPoints: Map<string, string>;
  loadedPointsData: Map<string, LoadedPointsData>;
};

export type PointsSliceActions = {
  addPoints: (points: Points, index?: number) => void;
  updatePoints: (pointsId: string, updates: Partial<Points>) => void;
  movePoints: (pointsId: string, newIndex: number) => void;
  deletePoints: (pointsId: string) => boolean;
  clearPoints: () => void;
  loadPoints: (
    pointsId: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
      newDataSource?: PointsDataSource;
    },
  ) => Promise<PointsData>;
  loadPointsCoordinates: (
    pointsId: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<[Float32Array, Float32Array]>;
  unloadPoints: (pointsId: string) => boolean;
};

export const createPointsSlice: TissUUmapsStateCreator<PointsSlice> = (
  set,
  get,
) => ({
  ...createInitialPointsSliceState(),
  addPoints: (points, index) => {
    const state = get();
    if (state.points.some((x) => x.id === points.id)) {
      throw new Error(`Points with ID ${points.id} already exists.`);
    }
    if (index !== undefined && (index < 0 || index > state.points.length)) {
      throw new Error(`Index ${index} out of bounds.`);
    }
    set((draft) => {
      draft.points.splice(index ?? draft.points.length, 0, points);
    });
  },
  updatePoints: (pointsId, updates) => {
    if (updates.id !== undefined || updates.dataSource !== undefined) {
      throw new Error("Updating points ID or data source is not allowed.");
    }
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
    if (newIndex < 0 || newIndex >= state.points.length) {
      throw new Error(`Index ${newIndex} out of bounds.`);
    }
    const oldIndex = state.points.findIndex((points) => points.id === pointsId);
    if (oldIndex === -1) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const pointsDraft = draft.points.splice(oldIndex, 1)[0]!;
        draft.points.splice(newIndex, 0, pointsDraft);
      });
    }
  },
  deletePoints: (pointsId) => {
    const state = get();
    const index = state.points.findIndex((points) => points.id === pointsId);
    if (index !== -1) {
      if (state.loadedPoints.has(pointsId)) {
        state.unloadPoints(pointsId);
      }
      set((draft) => {
        draft.points.splice(index, 1);
      });
      return true;
    }
    return false;
  },
  clearPoints: () => {
    const state = get();
    for (const loadedData of state.loadedPointsData.values()) {
      loadedData.data.close();
    }
    set(createInitialPointsSliceState());
  },
  loadPoints: deduplicate(
    async (pointsId, options) => {
      const {
        signal,
        reload = false,
        onProgress,
        newDataSource,
      } = options ?? {};
      signal?.throwIfAborted();

      const state = get();
      const points = state.points.find((points) => points.id === pointsId);
      if (points === undefined) {
        throw new Error(`Points with ID ${pointsId} not found.`);
      }
      const dataSource = newDataSource ?? points.dataSource;

      let oldLoadedData;
      const oldLoadedDataKey = state.loadedPoints.get(pointsId);
      if (oldLoadedDataKey !== undefined) {
        oldLoadedData = state.loadedPointsData.get(oldLoadedDataKey);
        if (
          !reload &&
          newDataSource === undefined &&
          oldLoadedData !== undefined
        ) {
          return oldLoadedData.data;
        }
      }

      let existingLoadedData = oldLoadedData;
      if (existingLoadedData === undefined) {
        for (const [key, value] of state.loadedPointsData) {
          if (deepEqual(value.dataSource, dataSource)) {
            existingLoadedData = value;
            if (!reload) {
              set((draft) => {
                draft.loadedPoints.set(pointsId, key);
                if (newDataSource !== undefined) {
                  const pointsDraft = draft.points.find(
                    (points) => points.id === pointsId,
                  )!;
                  pointsDraft.dataSource = newDataSource;
                }
              });
              return existingLoadedData.data;
            }
            break;
          }
        }
      }

      let data = existingLoadedData?.data;
      if (reload || newDataSource !== undefined || data === undefined) {
        const dataProvider = state.pointsDataProviders.get(dataSource.type);
        if (dataProvider === undefined) {
          throw new Error(
            `No points data provider registered for data source type ${dataSource.type}.`,
          );
        }
        data = await dataProvider.open(dataSource, {
          signal,
          onProgress,
          workspace: state.workspace,
        });
        signal?.throwIfAborted();
        const currentState = get();
        const currentPoints = currentState.points.find(
          (points) => points.id === pointsId,
        );
        if (
          currentPoints === undefined ||
          !deepEqual(currentPoints.dataSource, points.dataSource)
        ) {
          data.close();
          throw new DOMException(
            `Points with ID ${pointsId} have been deleted or their data source has changed.`,
            "AbortError",
          );
        }
      }

      set((draft) => {
        let loadedDataKey;
        for (const [key, value] of draft.loadedPointsData) {
          if (deepEqual(value.dataSource, dataSource)) {
            loadedDataKey = key;
            break;
          }
        }
        if (loadedDataKey === undefined) {
          do {
            loadedDataKey = crypto.randomUUID();
          } while (draft.loadedPointsData.has(loadedDataKey));
        }
        draft.loadedPointsData.set(loadedDataKey, {
          dataSource,
          data,
        });
        draft.loadedPoints.set(pointsId, loadedDataKey);
        if (newDataSource !== undefined) {
          const pointsDraft = draft.points.find(
            (points) => points.id === pointsId,
          )!;
          pointsDraft.dataSource = newDataSource;
        }
      });

      if (
        existingLoadedData !== undefined &&
        existingLoadedData.data !== data
      ) {
        existingLoadedData.data.close();
      }

      return data;
    },
    (_pointsId, options) => options?.signal,
  ),
  loadPointsCoordinates: deduplicate(
    async (pointsId, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the points, the corresponding data source, and the requested coordinates are already loaded
      const state = get();
      const loadedDataKey = state.loadedPoints.get(pointsId);
      if (loadedDataKey === undefined) {
        throw new Error(`Points with ID ${pointsId} not loaded.`);
      }
      const loadedData = state.loadedPointsData.get(loadedDataKey);
      if (loadedData === undefined) {
        throw new Error(
          `Data source for points with ID ${pointsId} not loaded.`,
        );
      }
      if (loadedData.loadedCoordinates !== undefined && !reload) {
        return loadedData.loadedCoordinates;
      }
      // Load the requested coordinates
      const coordinates = await loadedData.data.loadCoordinates({
        signal,
        onProgress,
      });
      signal?.throwIfAborted();
      // Check if the points have been unloaded or their data source has changed
      const currentState = get();
      const currentLoadedDataKey = currentState.loadedPoints.get(pointsId);
      if (
        currentLoadedDataKey === undefined ||
        currentLoadedDataKey !== loadedDataKey
      ) {
        throw new DOMException(
          `Points with ID ${pointsId} have been unloaded or their data source has changed.`,
          "AbortError",
        );
      }
      const currentLoadedData =
        currentState.loadedPointsData.get(currentLoadedDataKey);
      if (
        currentLoadedData === undefined ||
        !deepEqual(currentLoadedData.dataSource, loadedData.dataSource)
      ) {
        throw new DOMException(
          `Data source for points with ID ${pointsId} has been unloaded or changed.`,
          "AbortError",
        );
      }
      // Store the loaded coordinates in the state
      set((draft) => {
        const loadedDataDraft =
          draft.loadedPointsData.get(currentLoadedDataKey)!;
        loadedDataDraft.loadedCoordinates = coordinates;
      });
      return coordinates;
    },
    (_pointsId, options) => options?.signal,
  ),
  unloadPoints: (pointsId) => {
    const state = get();
    const loadedDataKey = state.loadedPoints.get(pointsId);
    if (loadedDataKey === undefined) {
      return false;
    }
    const loadedData = state.loadedPointsData.get(loadedDataKey);
    if (loadedData === undefined) {
      throw new Error(`Data source for points with ID ${pointsId} not loaded.`);
    }
    let destroy = true;
    for (const [otherPointsId, otherLoadedDataKey] of state.loadedPoints) {
      if (otherPointsId !== pointsId && otherLoadedDataKey === loadedDataKey) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedPoints.delete(pointsId);
      if (destroy) {
        draft.loadedPointsData.delete(loadedDataKey);
      }
    });
    if (destroy) {
      loadedData.data.close();
    }
    return true;
  },
});

function createInitialPointsSliceState(): PointsSliceState {
  return {
    points: [],
    loadedPoints: new Map(),
    loadedPointsData: new Map(),
  };
}
