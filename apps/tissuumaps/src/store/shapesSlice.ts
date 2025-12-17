import {
  type Shapes,
  type ShapesData,
  type ShapesDataSource,
} from "@tissuumaps/core";

import { MapUtils } from "../utils";
import { type TissUUmapsStateCreator } from "./store";

export type ShapesSlice = ShapesSliceState & ShapesSliceActions;

export type ShapesSliceState = {
  shapesMap: Map<string, Shapes>;
  shapesDataCache: Map<ShapesDataSource, ShapesData>;
};

export type ShapesSliceActions = {
  addShapes: (shapes: Shapes, index?: number) => void;
  loadShapes: (
    shapes: Shapes,
    options: { signal?: AbortSignal },
  ) => Promise<ShapesData>;
  loadShapesByID: (
    shapesId: string,
    options: { signal?: AbortSignal },
  ) => Promise<ShapesData>;
  unloadShapes: (shapes: Shapes) => void;
  unloadShapesByID: (shapesId: string) => void;
  deleteShapes: (shapes: Shapes) => void;
  deleteShapesByID: (shapesId: string) => void;
  clearShapes: () => void;
};

export const createShapesSlice: TissUUmapsStateCreator<ShapesSlice> = (
  set,
  get,
) => ({
  ...initialShapesSliceState,
  addShapes: (shapes, index) => {
    const state = get();
    const oldShapes = state.shapesMap.get(shapes.id);
    if (oldShapes !== undefined) {
      state.unloadShapes(oldShapes);
    }
    set((draft) => {
      draft.shapesMap = MapUtils.cloneAndSpliceSet(
        draft.shapesMap,
        shapes.id,
        shapes,
        index,
      );
    });
  },
  loadShapes: async (shapes, { signal }: { signal?: AbortSignal } = {}) => {
    signal?.throwIfAborted();
    const state = get();
    let shapesData = state.shapesDataCache.get(shapes.dataSource);
    if (shapesData !== undefined) {
      return shapesData;
    }
    const shapesDataLoaderFactory = state.shapesDataLoaderFactories.get(
      shapes.dataSource.type,
    );
    if (shapesDataLoaderFactory === undefined) {
      throw new Error(
        `No shapes data loader found for type ${shapes.dataSource.type}.`,
      );
    }
    const shapesDataLoader = shapesDataLoaderFactory(
      shapes.dataSource,
      state.projectDir,
      state.loadTableByID,
    );
    shapesData = await shapesDataLoader.loadShapes({ signal });
    signal?.throwIfAborted();
    set((draft) => {
      draft.shapesDataCache.set(shapes.dataSource, shapesData);
    });
    return shapesData;
  },
  loadShapesByID: async (
    shapesId,
    { signal }: { signal?: AbortSignal } = {},
  ) => {
    signal?.throwIfAborted();
    const state = get();
    const shapes = state.shapesMap.get(shapesId);
    if (shapes === undefined) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    return state.loadShapes(shapes, { signal });
  },
  unloadShapes: (shapes) => {
    const state = get();
    const shapesData = state.shapesDataCache.get(shapes.dataSource);
    set((draft) => {
      draft.shapesDataCache.delete(shapes.dataSource);
    });
    shapesData?.destroy();
  },
  unloadShapesByID: (shapesId) => {
    const state = get();
    const shapes = state.shapesMap.get(shapesId);
    if (shapes === undefined) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    state.unloadShapes(shapes);
  },
  deleteShapes: (shapes) => {
    const state = get();
    state.unloadShapes(shapes);
    set((draft) => {
      draft.shapesMap.delete(shapes.id);
    });
  },
  deleteShapesByID: (shapesId) => {
    const state = get();
    const shapes = state.shapesMap.get(shapesId);
    if (shapes === undefined) {
      throw new Error(`Shapes with ID ${shapesId} not found.`);
    }
    state.deleteShapes(shapes);
  },
  clearShapes: () => {
    const state = get();
    state.shapesMap.forEach((shapes) => {
      state.deleteShapes(shapes);
    });
    set(initialShapesSliceState);
  },
});

const initialShapesSliceState: ShapesSliceState = {
  shapesMap: new Map(),
  shapesDataCache: new Map(),
};
