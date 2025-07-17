import { IShapesData, IShapesDataLoader } from "../data/shapes";
import { ITableData } from "../data/table";
import { IShapesDataSourceModel, IShapesModel } from "../models/shapes";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

type ShapesDataLoaderFactory = (
  dataSource: IShapesDataSourceModel,
  projectDir: FileSystemDirectoryHandle | null,
  loadTable: (tableId: string) => Promise<ITableData>,
) => IShapesDataLoader<IShapesData>;

export type ShapesSlice = ShapesSliceState & ShapesSliceActions;

export type ShapesSliceState = {
  shapesMap: Map<string, IShapesModel>;
  shapesDataCache: Map<IShapesDataSourceModel, IShapesData>;
  shapesDataLoaderFactories: Map<string, ShapesDataLoaderFactory>;
};

export type ShapesSliceActions = {
  setShapes: (shapes: IShapesModel, index?: number) => void;
  loadShapes: (shapes: IShapesModel) => Promise<IShapesData>;
  deleteShapes: (shapes: IShapesModel) => void;
};

export const createShapesSlice: BoundStoreStateCreator<ShapesSlice> = (
  set,
  get,
) => ({
  ...initialShapesSliceState,
  setShapes: (shapes, index) => {
    set((draft) => {
      const oldShapes = draft.shapesMap.get(shapes.id);
      draft.shapesMap = MapUtils.cloneAndSpliceSet(
        draft.shapesMap,
        shapes.id,
        shapes,
        index,
      );
      if (oldShapes !== undefined) {
        draft.shapesDataCache.delete(oldShapes.dataSource);
      }
    });
  },
  loadShapes: async (shapes) => {
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
      (tableId) => {
        const state = get();
        const table = state.tableMap.get(tableId);
        if (table === undefined) {
          throw new Error(`Table with ID ${tableId} not found.`);
        }
        return state.loadTable(table);
      },
    );
    shapesData = await shapesDataLoader.loadShapes();
    set((draft) => {
      draft.shapesDataCache.set(shapes.dataSource, shapesData);
    });
    return shapesData;
  },
  deleteShapes: (shapes) => {
    set((draft) => {
      draft.shapesMap.delete(shapes.id);
      draft.shapesDataCache.delete(shapes.dataSource);
    });
  },
});

const initialShapesSliceState: ShapesSliceState = {
  shapesMap: new Map<string, IShapesModel>(),
  shapesDataCache: new Map<IShapesDataSourceModel, IShapesData>(),
  shapesDataLoaderFactories: new Map<string, ShapesDataLoaderFactory>(),
};
