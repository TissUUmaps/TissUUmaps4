import { IShapesData, IShapesDataLoader } from "../data/shapes";
import { IShapesDataSourceModel, IShapesModel } from "../models/shapes";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type ShapesSlice = ShapesSliceState & ShapesSliceActions;

export type ShapesSliceState = {
  shapes: Map<string, IShapesModel>;
  shapesData: Map<string, IShapesData>;
  shapesDataLoaders: Map<
    string,
    IShapesDataLoader<IShapesDataSourceModel<string>>
  >;
};

export type ShapesSliceActions = {
  setShapes: (
    shapesId: string,
    shapes: IShapesModel,
    shapesIndex?: number,
  ) => void;
  loadShapes: (shapesId: string, shapes?: IShapesModel) => Promise<IShapesData>;
  deleteShapes: (shapesId: string) => void;
  registerShapesDataLoader: (
    shapesDataSourceType: string,
    shapesDataLoader: IShapesDataLoader<IShapesDataSourceModel<string>>,
  ) => void;
  unregisterShapesDataLoader: (shapesDataSourceType: string) => void;
};

export const createShapesSlice: BoundStoreStateCreator<ShapesSlice> = (
  set,
  get,
) => ({
  ...initialShapesSliceState,
  setShapes: (shapesId, shapes, shapesIndex) => {
    set((draft) => {
      draft.shapes = MapUtils.cloneAndSet(
        draft.shapes,
        shapesId,
        shapes,
        shapesIndex,
      );
    });
  },
  loadShapes: async (shapesId, shapes) => {
    const state = get();
    if (state.shapesData.has(shapesId)) {
      return state.shapesData.get(shapesId)!;
    }
    if (shapes === undefined) {
      shapes = state.shapes.get(shapesId);
      if (shapes === undefined) {
        throw new Error(`No shapes found for ID: ${shapesId}`);
      }
    }
    const shapesDataLoader = state.shapesDataLoaders.get(
      shapes.dataSource.type,
    );
    if (shapesDataLoader === undefined) {
      throw new Error(
        `No shapes data loader registered for shapes data source type: ${shapes.dataSource.type}`,
      );
    }
    const shapesData = await shapesDataLoader.loadShapes(shapes.dataSource);
    set((draft) => {
      draft.shapesData.set(shapesId, shapesData);
    });
    return shapesData;
  },
  deleteShapes: (shapesId) => {
    set((draft) => {
      draft.shapes.delete(shapesId);
      draft.shapesData.delete(shapesId);
    });
  },
  registerShapesDataLoader: (shapesDataSourceType, shapesDataLoader) => {
    set((draft) => {
      if (draft.shapesDataLoaders.has(shapesDataSourceType)) {
        console.warn(
          `Shapes data loader was already registered for shapes data source type: ${shapesDataSourceType}`,
        );
      }
      draft.shapesDataLoaders.set(shapesDataSourceType, shapesDataLoader);
    });
  },
  unregisterShapesDataLoader: (shapesDataSourceType) => {
    set((draft) => {
      if (!draft.shapesDataLoaders.delete(shapesDataSourceType)) {
        console.warn(
          `No shapes data loader registered for shapes data source type: ${shapesDataSourceType}`,
        );
      }
    });
  },
});

const initialShapesSliceState: ShapesSliceState = {
  shapes: new Map<string, IShapesModel>(),
  shapesData: new Map<string, IShapesData>(),
  shapesDataLoaders: new Map<
    string,
    IShapesDataLoader<IShapesDataSourceModel<string>>
  >(),
};
