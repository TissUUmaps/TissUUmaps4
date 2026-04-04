import { deepEqual } from "fast-equals";

import {
  type MultiPolygon,
  type ProgressCallback,
  type Shapes,
  type ShapesData,
  type ShapesDataSource,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

type LoadedShapesData = {
  dataSource: ShapesDataSource;
  data: ShapesData;
  loadedMultiPolygons?: MultiPolygon[];
};

export type ShapesSlice = ShapesSliceState & ShapesSliceActions;

export type ShapesSliceState = {
  shapes: Shapes[];
  loadedShapes: Map<string, string>;
  loadedShapesData: Map<string, LoadedShapesData>;
};

export type ShapesSliceActions = {
  addShapes: (shapes: Shapes, index?: number) => void;
  updateShapes: (shapesId: string, updates: Partial<Shapes>) => void;
  moveShapes: (shapesId: string, newIndex: number) => void;
  deleteShapes: (shapesId: string) => boolean;
  clearShapes: () => void;
  loadShapes: (
    shapesId: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
      newDataSource?: ShapesDataSource;
    },
  ) => Promise<ShapesData>;
  loadShapesMultiPolygons: (
    shapesId: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<MultiPolygon[]>;
  unloadShapes: (shapesId: string) => boolean;
};

export const createShapesSlice: TissUUmapsStateCreator<ShapesSlice> = (
  set,
  get,
) => ({
  ...createInitialShapesSliceState(),
  addShapes: (shapes, index) => {
    const state = get();
    if (state.shapes.some((x) => x.id === shapes.id)) {
      throw new Error(`Shapes with ID ${shapes.id} already exists.`);
    }
    if (index !== undefined && (index < 0 || index > state.shapes.length)) {
      throw new Error(`Index ${index} out of bounds.`);
    }
    set((draft) => {
      draft.shapes.splice(index ?? draft.shapes.length, 0, shapes);
    });
  },
  updateShapes: (shapesId, updates) => {
    if (updates.id !== undefined || updates.dataSource !== undefined) {
      throw new Error("Updating shapes ID or data source is not allowed.");
    }
    const state = get();
    const index = state.shapes.findIndex((shapes) => shapes.id === shapesId);
    if (index === -1) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    set((draft) => {
      draft.shapes[index] = { ...draft.shapes[index]!, ...updates };
    });
  },
  moveShapes: (shapesId, newIndex) => {
    const state = get();
    if (newIndex < 0 || newIndex >= state.shapes.length) {
      throw new Error(`Index ${newIndex} out of bounds.`);
    }
    const oldIndex = state.shapes.findIndex((shapes) => shapes.id === shapesId);
    if (oldIndex === -1) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const shapesDraft = draft.shapes.splice(oldIndex, 1)[0]!;
        draft.shapes.splice(newIndex, 0, shapesDraft);
      });
    }
  },
  deleteShapes: (shapesId) => {
    const state = get();
    const index = state.shapes.findIndex((shapes) => shapes.id === shapesId);
    if (index !== -1) {
      if (state.loadedShapes.has(shapesId)) {
        state.unloadShapes(shapesId);
      }
      set((draft) => {
        draft.shapes.splice(index, 1);
      });
      return true;
    }
    return false;
  },
  clearShapes: () => {
    const state = get();
    for (const loadedData of state.loadedShapesData.values()) {
      loadedData.data.close();
    }
    set(createInitialShapesSliceState());
  },
  loadShapes: deduplicate(
    async (shapesId, options) => {
      const {
        signal,
        reload = false,
        onProgress,
        newDataSource,
      } = options ?? {};
      signal?.throwIfAborted();

      const state = get();
      const shapes = state.shapes.find((shapes) => shapes.id === shapesId);
      if (shapes === undefined) {
        throw new Error(`Shapes with ID ${shapesId} not found.`);
      }
      const dataSource = newDataSource ?? shapes.dataSource;

      let oldLoadedData;
      const oldLoadedDataKey = state.loadedShapes.get(shapesId);
      if (oldLoadedDataKey !== undefined) {
        oldLoadedData = state.loadedShapesData.get(oldLoadedDataKey);
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
        for (const [key, value] of state.loadedShapesData) {
          if (deepEqual(value.dataSource, dataSource)) {
            existingLoadedData = value;
            if (!reload) {
              set((draft) => {
                draft.loadedShapes.set(shapesId, key);
                if (newDataSource !== undefined) {
                  const shapesDraft = draft.shapes.find(
                    (shapes) => shapes.id === shapesId,
                  )!;
                  shapesDraft.dataSource = newDataSource;
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
        const dataProvider = state.shapesDataProviders.get(dataSource.type);
        if (dataProvider === undefined) {
          throw new Error(
            `No shapes data provider registered for data source type ${dataSource.type}.`,
          );
        }
        data = await dataProvider.open(dataSource, {
          signal,
          onProgress,
          workspace: state.workspace,
        });
        signal?.throwIfAborted();
        const currentState = get();
        const currentShapes = currentState.shapes.find(
          (shapes) => shapes.id === shapesId,
        );
        if (
          currentShapes === undefined ||
          !deepEqual(currentShapes.dataSource, shapes.dataSource)
        ) {
          data.close();
          throw new DOMException(
            `Shapes with ID ${shapesId} have been deleted or their data source has changed.`,
            "AbortError",
          );
        }
      }
      set((draft) => {
        let loadedDataKey;
        for (const [key, value] of draft.loadedShapesData) {
          if (deepEqual(value.dataSource, dataSource)) {
            loadedDataKey = key;
            break;
          }
        }
        if (loadedDataKey === undefined) {
          do {
            loadedDataKey = crypto.randomUUID();
          } while (draft.loadedShapesData.has(loadedDataKey));
        }
        draft.loadedShapesData.set(loadedDataKey, { dataSource, data });
        draft.loadedShapes.set(shapesId, loadedDataKey);
        if (newDataSource !== undefined) {
          const shapesDraft = draft.shapes.find(
            (shapes) => shapes.id === shapesId,
          )!;
          shapesDraft.dataSource = newDataSource;
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
    (_shapesId, options) => options?.signal,
  ),
  loadShapesMultiPolygons: deduplicate(
    async (shapesId, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the shapes, the corresponding data source, and the requested multi-polygons are already loaded
      const state = get();
      const loadedDataKey = state.loadedShapes.get(shapesId);
      if (loadedDataKey === undefined) {
        throw new Error(`Shapes with ID ${shapesId} not loaded.`);
      }
      const loadedData = state.loadedShapesData.get(loadedDataKey);
      if (loadedData === undefined) {
        throw new Error(
          `Data source for shapes with ID ${shapesId} not loaded.`,
        );
      }
      const oldMultiPolygons = loadedData.loadedMultiPolygons;
      if (oldMultiPolygons !== undefined && !reload) {
        return oldMultiPolygons;
      }
      // Load the requested multi-polygons
      const multiPolygons = await loadedData.data.loadMultiPolygons({
        signal,
        onProgress,
      });
      signal?.throwIfAborted();
      // Check if the shapes have been unloaded or their data source has changed
      const currentState = get();
      const currentLoadedDataKey = currentState.loadedShapes.get(shapesId);
      if (
        currentLoadedDataKey === undefined ||
        currentLoadedDataKey !== loadedDataKey
      ) {
        throw new DOMException(
          `Shapes with ID ${shapesId} have been unloaded or their data source has changed.`,
          "AbortError",
        );
      }
      const currentLoadedData =
        currentState.loadedShapesData.get(currentLoadedDataKey);
      if (
        currentLoadedData === undefined ||
        !deepEqual(currentLoadedData.dataSource, loadedData.dataSource)
      ) {
        throw new DOMException(
          `Data source for shapes with ID ${shapesId} has been unloaded or changed.`,
          "AbortError",
        );
      }
      // Store the loaded multi-polygons in the state
      set((draft) => {
        const loadedDataDraft =
          draft.loadedShapesData.get(currentLoadedDataKey)!;
        loadedDataDraft.loadedMultiPolygons = multiPolygons;
      });
      return multiPolygons;
    },
    (_shapesId, options) => options?.signal,
  ),
  unloadShapes: (shapesId) => {
    const state = get();
    const loadedDataKey = state.loadedShapes.get(shapesId);
    if (loadedDataKey === undefined) {
      return false;
    }
    const loadedData = state.loadedShapesData.get(loadedDataKey);
    if (loadedData === undefined) {
      throw new Error(`Data source for shapes with ID ${shapesId} not loaded.`);
    }
    let destroy = true;
    for (const [otherShapesId, otherLoadedDataKey] of state.loadedShapes) {
      if (otherShapesId !== shapesId && otherLoadedDataKey === loadedDataKey) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedShapes.delete(shapesId);
      if (destroy) {
        draft.loadedShapesData.delete(loadedDataKey);
      }
    });
    if (destroy) {
      loadedData.data.close();
    }
    return true;
  },
});

function createInitialShapesSliceState(): ShapesSliceState {
  return {
    shapes: [],
    loadedShapes: new Map(),
    loadedShapesData: new Map(),
  };
}
