import { deepEqual } from "fast-equals";

import {
  type Shapes,
  type ShapesData,
  type ShapesDataSource,
} from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "./index";

export type ShapesSlice = ShapesSliceState & ShapesSliceActions;

export type ShapesSliceState = {
  shapes: Shapes[];
  _shapesDataCache: { dataSource: ShapesDataSource; data: ShapesData }[];
};

export type ShapesSliceActions = {
  addShapes: (shapes: Shapes, index?: number) => void;
  moveShapes: (shapesId: string, newIndex: number) => void;
  loadShapes: (
    shapesId: string,
    options: { signal?: AbortSignal },
  ) => Promise<ShapesData>;
  unloadShapes: (shapesId: string) => void;
  deleteShapes: (shapesId: string) => void;
  clearShapes: () => void;
};

export const createShapesSlice: TissUUmapsStateCreator<ShapesSlice> = (
  set,
  get,
) => ({
  ...initialShapesSliceState,
  addShapes: (shapes, index) => {
    const state = get();
    if (state.shapes.find((x) => x.id === shapes.id) !== undefined) {
      throw new Error(`Shapes with ID ${shapes.id} already exists.`);
    }
    set((draft) => {
      draft.shapes.splice(index ?? draft.shapes.length, 0, shapes);
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
  loadShapes: async (shapesId, { signal }: { signal?: AbortSignal } = {}) => {
    signal?.throwIfAborted();
    const state = get();
    const shapes = state.shapes.find((shapes) => shapes.id === shapesId);
    if (shapes === undefined) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    const cache = state._shapesDataCache.find(({ dataSource }) =>
      deepEqual(dataSource, shapes.dataSource),
    );
    if (cache !== undefined) {
      return cache.data;
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
      state.projectDir,
      state.loadTable,
    );
    const data = await dataLoader.loadShapes({ signal });
    signal?.throwIfAborted();
    set((draft) => {
      draft._shapesDataCache.push({ dataSource: shapes.dataSource, data });
    });
    return data;
  },
  unloadShapes: (shapesId) => {
    const state = get();
    const shapes = state.shapes.find((shapes) => shapes.id === shapesId);
    if (shapes === undefined) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    const cacheIndex = state._shapesDataCache.findIndex(({ dataSource }) =>
      deepEqual(dataSource, shapes.dataSource),
    );
    if (cacheIndex !== -1) {
      const cache = state._shapesDataCache[cacheIndex]!;
      set((draft) => {
        draft._shapesDataCache.splice(cacheIndex, 1);
      });
      cache.data.destroy();
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
});

const initialShapesSliceState: ShapesSliceState = {
  shapes: [],
  _shapesDataCache: [],
};
