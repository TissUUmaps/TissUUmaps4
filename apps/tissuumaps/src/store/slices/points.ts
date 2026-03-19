import { deepEqual } from "fast-equals";

import {
  type Points,
  type PointsData,
  type PointsDataSource,
  type ProgressCallback,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

type LoadedPoints = {
  loadedDataSourceKey: string;
};

type LoadedPointsDataSource = {
  dataSource: PointsDataSource;
  data: PointsData;
  loadedCoordinates: Map<string, Float32Array>;
};

export type PointsSlice = PointsSliceState & PointsSliceActions;

export type PointsSliceState = {
  points: Points[];
  loadedPoints: Map<string, LoadedPoints>;
  loadedPointsDataSources: Map<string, LoadedPointsDataSource>;
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
  ) => Promise<LoadedPoints>;
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
    for (const loadedDataSource of state.loadedPointsDataSources.values()) {
      loadedDataSource.data.destroy();
    }
    set(createInitialPointsSliceState());
  },
  loadPoints: deduplicate(async (pointsId, options) => {
    const { signal, reload = false, onProgress } = options ?? {};
    signal?.throwIfAborted();
    // Check if the points are already loaded
    const state = get();
    const loadedPoints = state.loadedPoints.get(pointsId);
    if (loadedPoints !== undefined && !reload) {
      return loadedPoints;
    }
    // Find the points and the corresponding data source (if loaded)
    const points = state.points.find((points) => points.id === pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    let oldLoadedDataSource: LoadedPointsDataSource | undefined;
    for (const loadedDataSource of state.loadedPointsDataSources.values()) {
      if (deepEqual(loadedDataSource.dataSource, points.dataSource)) {
        oldLoadedDataSource = loadedDataSource;
        break;
      }
    }
    // Load the data source if not already loaded or if a reload has been requested
    let loadedDataSource = oldLoadedDataSource;
    if (loadedDataSource === undefined || reload) {
      const { dataLoaderFactory } =
        state.pointsDataLoaderRegistry.get(points.dataSource.type) ?? {};
      if (dataLoaderFactory === undefined) {
        throw new Error(
          `No points data loader registered for data source type ${points.dataSource.type}.`,
        );
      }
      const dataLoader = dataLoaderFactory(points.dataSource, state.workspace);
      const data = await dataLoader.loadPoints({ signal, onProgress });
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
      loadedDataSource = {
        dataSource: currentPoints.dataSource,
        data,
        loadedCoordinates: new Map(),
      };
    }
    // Store the loaded points and the corresponding data source in the state
    let newLoadedPoints: LoadedPoints;
    set((draft) => {
      let loadedDataSourceKey;
      for (const [key, value] of draft.loadedPointsDataSources) {
        if (deepEqual(value.dataSource, loadedDataSource.dataSource)) {
          loadedDataSourceKey = key;
          break;
        }
      }
      if (loadedDataSourceKey === undefined) {
        do {
          loadedDataSourceKey = crypto.randomUUID();
        } while (draft.loadedPointsDataSources.has(loadedDataSourceKey));
      }
      newLoadedPoints = { loadedDataSourceKey };
      draft.loadedPoints.set(pointsId, newLoadedPoints);
      draft.loadedPointsDataSources.set(loadedDataSourceKey, loadedDataSource);
    });
    // Clean up old data if the loaded data source has changed
    if (
      oldLoadedDataSource !== undefined &&
      oldLoadedDataSource.data !== loadedDataSource.data
    ) {
      oldLoadedDataSource.data.destroy();
    }
    return newLoadedPoints!;
  }),
  loadPointsCoordinates: deduplicate(async (pointsId, dimension, options) => {
    const { signal, reload = false, onProgress } = options ?? {};
    signal?.throwIfAborted();
    // Check if the points, the corresponding data source, and the requested coordinates are already loaded
    const state = get();
    const loadedPoints = state.loadedPoints.get(pointsId);
    if (loadedPoints === undefined) {
      throw new Error(`Points with ID ${pointsId} not loaded.`);
    }
    const loadedDataSource = state.loadedPointsDataSources.get(
      loadedPoints.loadedDataSourceKey,
    );
    if (loadedDataSource === undefined) {
      throw new Error(`Data source for points with ID ${pointsId} not loaded.`);
    }
    const oldCoordinates = loadedDataSource.loadedCoordinates.get(dimension);
    if (oldCoordinates !== undefined && !reload) {
      return oldCoordinates;
    }
    // Load the requested coordinates
    const coordinates = await loadedDataSource.data.loadCoordinates(dimension, {
      signal,
      onProgress,
    });
    signal?.throwIfAborted();
    // Check if the points have been unloaded or their data source has changed
    const currentState = get();
    const currentLoadedPoints = currentState.loadedPoints.get(pointsId);
    if (
      currentLoadedPoints === undefined ||
      currentLoadedPoints.loadedDataSourceKey !==
        loadedPoints.loadedDataSourceKey
    ) {
      throw new DOMException(
        `Points with ID ${pointsId} have been unloaded or their data source has changed.`,
        "AbortError",
      );
    }
    const currentLoadedDataSource = currentState.loadedPointsDataSources.get(
      currentLoadedPoints.loadedDataSourceKey,
    );
    if (
      currentLoadedDataSource === undefined ||
      !deepEqual(
        currentLoadedDataSource.dataSource,
        loadedDataSource.dataSource,
      )
    ) {
      throw new DOMException(
        `Data source for points with ID ${pointsId} has been unloaded or changed.`,
        "AbortError",
      );
    }
    // Store the loaded coordinates in the state
    set((draft) => {
      const loadedPointsDraft = draft.loadedPoints.get(pointsId)!;
      const loadedDataSourceDraft = draft.loadedPointsDataSources.get(
        loadedPointsDraft.loadedDataSourceKey,
      )!;
      loadedDataSourceDraft.loadedCoordinates.set(dimension, coordinates);
    });
    return coordinates;
  }),
  unloadPoints: (pointsId) => {
    const state = get();
    const loadedPoints = state.loadedPoints.get(pointsId);
    if (loadedPoints === undefined) {
      return false;
    }
    const loadedDataSource = state.loadedPointsDataSources.get(
      loadedPoints.loadedDataSourceKey,
    );
    if (loadedDataSource === undefined) {
      throw new Error(`Data source for points with ID ${pointsId} not loaded.`);
    }
    let destroy = true;
    for (const [otherPointsId, otherLoadedPoints] of state.loadedPoints) {
      if (
        otherPointsId !== pointsId &&
        otherLoadedPoints.loadedDataSourceKey ===
          loadedPoints.loadedDataSourceKey
      ) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedPoints.delete(pointsId);
      if (destroy) {
        draft.loadedPointsDataSources.delete(loadedPoints.loadedDataSourceKey);
      }
    });
    if (destroy) {
      loadedDataSource.data.destroy();
    }
    return true;
  },
});

function createInitialPointsSliceState(): PointsSliceState {
  return {
    points: [],
    loadedPoints: new Map(),
    loadedPointsDataSources: new Map(),
  };
}
