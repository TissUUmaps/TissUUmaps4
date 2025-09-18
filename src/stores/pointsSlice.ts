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
  loadTableByID: (tableId: string) => Promise<ITableData>,
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
  loadPointsByID: (pointsId: string) => Promise<IPointsData>;
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
      state.loadTableByID,
    );
    pointsData = await pointsDataLoader.loadPoints();
    set((draft) => {
      draft.pointsDataCache.set(points.dataSource, pointsData);
    });
    return pointsData;
  },
  loadPointsByID: async (pointsId) => {
    const state = get();
    const points = state.pointsMap.get(pointsId);
    if (points === undefined) {
      throw new Error(`Points with ID ${pointsId} not found.`);
    }
    return state.loadPoints(points);
  },
  deletePoints: (points) => {
    set((draft) => {
      draft.pointsMap.delete(points.id);
      draft.pointsDataCache.delete(points.dataSource);
    });
  },
});

const initialPointsSliceState: PointsSliceState = {
  // TODO remove test data
  pointsMap: new Map<string, IPointsModel>([
    [
      "iss",
      {
        id: "iss",
        name: "ISS",
        dataSource: {
          type: "table",
          tableId: "iss",
        } as ITablePointsDataSourceModel,
        layerConfigs: [
          { layerId: "breast", x: "global_X_pos", y: "global_Y_pos" },
        ],
      },
    ],
  ]),
  pointsDataCache: new Map<IPointsDataSourceModel, IPointsData>(),
  pointsDataLoaderFactories: new Map<string, PointsDataLoaderFactory>([
    [
      TABLE_POINTS_DATA_SOURCE,
      (dataSource, projectDir, loadTableByID) =>
        new TablePointsDataLoader(
          dataSource as ITablePointsDataSourceModel,
          projectDir,
          loadTableByID,
        ),
    ],
  ]),
};
