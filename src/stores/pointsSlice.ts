import {
  ITablePointsDataSourceModel,
  TABLE_POINTS_DATA_SOURCE,
  TablePointsDataLoader,
} from "../data/loaders/table";
import { IPointsData, IPointsDataLoader } from "../data/points";
import { ITableData } from "../data/table";
import { IPointsDataSourceModel, IPointsModel } from "../models/points";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

type PointsDataLoaderFactory = (
  dataSource: IPointsDataSourceModel,
  projectDir: FileSystemDirectoryHandle | null,
  loadTable: (tableId: string) => Promise<ITableData>,
) => IPointsDataLoader<IPointsData>;

export type PointsSlice = PointsSliceState & PointsSliceActions;

export type PointsSliceState = {
  pointsMap: Map<string, IPointsModel>;
  pointsDataCache: Map<IPointsDataSourceModel, IPointsData>;
  pointsDataLoaderFactories: Map<string, PointsDataLoaderFactory>;
};

export type PointsSliceActions = {
  setPoints: (points: IPointsModel, index?: number) => void;
  loadPoints: (points: IPointsModel) => Promise<IPointsData>;
  deletePoints: (points: IPointsModel) => void;
};

export const createPointsSlice: BoundStoreStateCreator<PointsSlice> = (
  set,
  get,
) => ({
  ...initialPointsSliceState,
  setPoints: (points, index) => {
    set((draft) => {
      const oldPoints = draft.pointsMap.get(points.id);
      draft.pointsMap = MapUtils.cloneAndSpliceSet(
        draft.pointsMap,
        points.id,
        points,
        index,
      );
      if (oldPoints !== undefined) {
        draft.pointsDataCache.delete(oldPoints.dataSource);
      }
    });
  },
  loadPoints: async (points) => {
    const state = get();
    let pointsData = state.pointsDataCache.get(points.dataSource);
    if (pointsData !== undefined) {
      return pointsData;
    }
    const pointsDataLoaderFactory = state.pointsDataLoaderFactories.get(
      points.dataSource.type,
    );
    if (pointsDataLoaderFactory === undefined) {
      throw new Error(
        `No points data loader found for type ${points.dataSource.type}.`,
      );
    }
    const pointsDataLoader = pointsDataLoaderFactory(
      points.dataSource,
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
    pointsData = await pointsDataLoader.loadPoints();
    set((draft) => {
      draft.pointsDataCache.set(points.dataSource, pointsData);
    });
    return pointsData;
  },
  deletePoints: (points) => {
    set((draft) => {
      draft.pointsMap.delete(points.id);
      draft.pointsDataCache.delete(points.dataSource);
    });
  },
});

const initialPointsSliceState: PointsSliceState = {
  pointsMap: new Map<string, IPointsModel>(),
  pointsDataCache: new Map<IPointsDataSourceModel, IPointsData>(),
  pointsDataLoaderFactories: new Map<string, PointsDataLoaderFactory>([
    [
      TABLE_POINTS_DATA_SOURCE,
      (dataSource, projectDir, loadTable) =>
        new TablePointsDataLoader(
          dataSource as ITablePointsDataSourceModel,
          projectDir,
          loadTable,
        ),
    ],
  ]),
};
