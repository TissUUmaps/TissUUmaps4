import { deepEqual } from "fast-equals";

import {
  type MultiPolygon,
  type Shapes,
  type ShapesData,
  type ShapesDataLoader,
  type ShapesDataSource,
} from "@tissuumaps/core";

import { loadTableDataProxy } from "../proxies/TableDataProxy";
import { type TissUUmapsStateCreator } from "./index";

export type LoadedShapes = {
  data: ShapesData;
  loadedMultiPolygons?: MultiPolygon[];
};

export type ShapesSlice = ShapesSliceState & ShapesSliceActions;

export type ShapesSliceState = {
  shapes: Shapes[];
  loadedShapes: Map<string, LoadedShapes>;
  shapesDataSourceCaches: { dataSource: ShapesDataSource; data: ShapesData }[];
};

export type ShapesSliceActions = {
  addShapes: (shapes: Shapes, index?: number) => void;
  updateShapes: (shapesId: string, updates: Partial<Shapes>) => void;
  moveShapes: (shapesId: string, newIndex: number) => void;
  deleteShapes: (shapesId: string) => void;
  clearShapes: () => void;
  createShapesDataLoader: (shapesId: string) => ShapesDataLoader<ShapesData>;
  loadShapes: (
    shapesId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedShapes>;
  loadShapesMultiPolygons: (
    shapesId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<MultiPolygon[]>;
  unloadShapesMultiPolygons: (shapesId: string) => void;
  unloadShapes: (shapesId: string) => void;
};

export const createShapesSlice: TissUUmapsStateCreator<ShapesSlice> = (
  set,
  get,
) => ({
  ...initialShapesSliceState,
  addShapes: (shapes, index) => {
    const state = get();
    if (state.shapes.some((x) => x.id === shapes.id)) {
      throw new Error(`Shapes with ID ${shapes.id} already exists.`);
    }
    set((draft) => {
      draft.shapes.splice(index ?? draft.shapes.length, 0, shapes);
    });
  },
  updateShapes: (shapesId, updates) => {
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
    const oldIndex = state.shapes.findIndex((shapes) => shapes.id === shapesId);
    if (oldIndex === -1) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const [shapes] = draft.shapes.splice(oldIndex, 1);
        draft.shapes.splice(newIndex, 0, shapes!);
      });
    }
  },
  deleteShapes: (shapesId) => {
    const state = get();
    const index = state.shapes.findIndex((shapes) => shapes.id === shapesId);
    if (index === -1) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    state.unloadShapes(shapesId);
    set((draft) => {
      draft.shapes.splice(index, 1);
    });
  },
  clearShapes: () => {
    const state = get();
    while (state.shapes.length > 0) {
      state.deleteShapes(state.shapes[0]!.id);
    }
    set(initialShapesSliceState);
  },
  createShapesDataLoader: (shapesId) => {
    const state = get();
    const shapes = state.shapes.find((shapes) => shapes.id === shapesId);
    if (shapes === undefined) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    const dataLoaderFactory = state.shapesDataLoaderFactories.get(
      shapes.dataSource.type,
    );
    if (dataLoaderFactory === undefined) {
      throw new Error(
        `No shapes data loader found for type ${shapes.dataSource.type}.`,
      );
    }
    const dataLoader = dataLoaderFactory(
      shapes.dataSource,
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
  loadShapes: async (shapesId, options) => {
    const { signal, reload = false } = options ?? {};
    signal?.throwIfAborted();
    const state = get();
    const loadedShapes = state.loadedShapes.get(shapesId);
    if (loadedShapes !== undefined && !reload) {
      return loadedShapes;
    }
    const shapes = state.shapes.find((shapes) => shapes.id === shapesId);
    if (shapes === undefined) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    let data;
    const dataSourceCache = state.shapesDataSourceCaches.find(
      ({ dataSource }) => deepEqual(dataSource, shapes.dataSource),
    );
    if (dataSourceCache !== undefined) {
      data = dataSourceCache.data;
    } else {
      const dataLoader = state.createShapesDataLoader(shapesId);
      const newData = await dataLoader.loadShapes({ signal });
      signal?.throwIfAborted();
      set((draft) => {
        draft.shapesDataSourceCaches.push({
          dataSource: shapes.dataSource,
          data: newData,
        });
      });
      data = newData;
    }
    const newLoadedShapes = { data };
    set((draft) => {
      draft.loadedShapes.set(shapesId, newLoadedShapes);
    });
    return newLoadedShapes;
  },
  loadShapesMultiPolygons: async (shapesId, options) => {
    const { signal, reload = false } = options ?? {};
    signal?.throwIfAborted();
    const state = get();
    const loadedShapes = await state.loadShapes(shapesId, { signal });
    signal?.throwIfAborted();
    if (loadedShapes.loadedMultiPolygons !== undefined && !reload) {
      return loadedShapes.loadedMultiPolygons;
    }
    const multiPolygons = await loadedShapes.data.loadMultiPolygons({ signal });
    signal?.throwIfAborted();
    set((draft) => {
      const loadedShapes = draft.loadedShapes.get(shapesId)!;
      loadedShapes.loadedMultiPolygons = multiPolygons;
    });
    return multiPolygons;
  },
  unloadShapesMultiPolygons: (shapesId) => {
    set((draft) => {
      const loadedShapes = draft.loadedShapes.get(shapesId);
      if (loadedShapes === undefined) {
        throw new Error(`Shapes with ID ${shapesId} not loaded.`);
      }
      loadedShapes.loadedMultiPolygons = undefined;
    });
  },
  unloadShapes: (shapesId) => {
    const state = get();
    const loadedShapes = state.loadedShapes.get(shapesId);
    if (loadedShapes !== undefined) {
      let destroy = true;
      for (const other of state.loadedShapes.values()) {
        if (other !== loadedShapes && other.data === loadedShapes.data) {
          destroy = false;
          break;
        }
      }
      set((draft) => {
        draft.loadedShapes.delete(shapesId);
        if (destroy) {
          draft.shapesDataSourceCaches = draft.shapesDataSourceCaches.filter(
            (dataSourceCache) => dataSourceCache.data !== loadedShapes.data,
          );
        }
      });
      if (destroy) {
        loadedShapes.data.destroy();
      }
    }
  },
});

const initialShapesSliceState: ShapesSliceState = {
  shapes: [],
  loadedShapes: new Map(),
  shapesDataSourceCaches: [],
};
