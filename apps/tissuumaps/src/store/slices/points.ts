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
  loadedCoordinates: Map<string, Float32Array>;
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
    },
  ) => Promise<PointsData>;
  loadPointsCoordinates: (
    pointsId: string,
    dimension: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<Float32Array>;
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
      loadedData.data.destroy();
    }
    set(createInitialPointsSliceState());
  },
  loadPoints: deduplicate(
    async (pointsId, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the points are already loaded
      const state = get();
      const loadedDataKey = state.loadedPoints.get(pointsId);
      if (loadedDataKey !== undefined && !reload) {
        const loadedData = state.loadedPointsData.get(loadedDataKey);
        if (loadedData !== undefined) {
          return loadedData.data;
        }
      }
      // Find the points and the corresponding data source (if loaded)
      const points = state.points.find((points) => points.id === pointsId);
      if (points === undefined) {
        throw new Error(`Points with ID ${pointsId} not found.`);
      }
      let oldLoadedData: LoadedPointsData | undefined;
      for (const loadedData of state.loadedPointsData.values()) {
        if (deepEqual(loadedData.dataSource, points.dataSource)) {
          oldLoadedData = loadedData;
          break;
        }
      }
      // Load the data source if not already loaded or if a reload has been requested
      let loadedData = oldLoadedData;
      if (loadedData === undefined || reload) {
        const { dataStorageFactory } =
          state.pointsDataStorageRegistry.get(points.dataSource.type) ?? {};
        if (dataStorageFactory === undefined) {
          throw new Error(
            `No points data storage adapter registered for data source type ${points.dataSource.type}.`,
          );
        }
        const dataStorage = dataStorageFactory(
          points.dataSource,
          state.workspace,
        );
        const data = await dataStorage.loadPoints({ signal, onProgress });
        signal?.throwIfAborted();
        // Check if the points have been deleted or their data source has changed
        const currentState = get();
        const currentPoints = currentState.points.find(
          (points) => points.id === pointsId,
        );
        if (
          currentPoints === undefined ||
          !deepEqual(currentPoints.dataSource, points.dataSource)
        ) {
          data.destroy();
          throw new DOMException(
            `Points with ID ${pointsId} have been deleted or their data source has changed.`,
            "AbortError",
          );
        }
        loadedData = {
          dataSource: currentPoints.dataSource,
          data,
          loadedCoordinates: new Map(),
        };
      }
      // Store the loaded points and the corresponding data source in the state
      set((draft) => {
        let loadedDataKey;
        for (const [key, value] of draft.loadedPointsData) {
          if (deepEqual(value.dataSource, loadedData.dataSource)) {
            loadedDataKey = key;
            break;
          }
        }
        if (loadedDataKey === undefined) {
          do {
            loadedDataKey = crypto.randomUUID();
          } while (draft.loadedPointsData.has(loadedDataKey));
        }
        draft.loadedPoints.set(pointsId, loadedDataKey);
        draft.loadedPointsData.set(loadedDataKey, loadedData);
      });
      // Clean up old data if the loaded data source has changed
      if (
        oldLoadedData !== undefined &&
        oldLoadedData.data !== loadedData.data
      ) {
        oldLoadedData.data.destroy();
      }
      return loadedData.data;
    },
    (_pointsId, options) => options?.signal,
  ),
  loadPointsCoordinates: deduplicate(
    async (pointsId, dimension, options) => {
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
      const oldCoordinates = loadedData.loadedCoordinates.get(dimension);
      if (oldCoordinates !== undefined && !reload) {
        return oldCoordinates;
      }
      // Load the requested coordinates
      const coordinates = await loadedData.data.loadCoordinates(dimension, {
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
        loadedDataDraft.loadedCoordinates.set(dimension, coordinates);
      });
      return coordinates;
    },
    (_pointsId, _dimension, options) => options?.signal,
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
      loadedData.data.destroy();
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
