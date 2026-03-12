import {
  type ImageData,
  type ImageDataLoader,
  type LabelsData,
  type LabelsDataLoader,
  type PointsData,
  type PointsDataLoader,
  type RawImageDataSource,
  type RawLabelsDataSource,
  type RawPointsDataSource,
  type RawShapesDataSource,
  type RawTableDataSource,
  type ShapesData,
  type ShapesDataLoader,
  type TableData,
  type TableDataLoader,
} from "@tissuumaps/core";
import {
  CSVTableDataLoader,
  GeoJSONShapesDataLoader,
  OpenSeadragonImageDataLoader,
  ParquetTableDataLoader,
  type RawCSVTableDataSource,
  type RawGeoJSONShapesDataSource,
  type RawOpenSeadragonImageDataSource,
  type RawParquetTableDataSource,
  type RawTablePointsDataSource,
  TablePointsDataLoader,
  createCSVTableDataSource,
  createGeoJSONShapesDataSource,
  createOpenSeadragonImageDataSource,
  createParquetTableDataSource,
  createTablePointsDataSource,
  csvTableDataSourceType,
  geoJSONShapesDataSourceType,
  openSeadragonImageDataSourceType,
  parquetTableDataSourceType,
  tablePointsDataSourceType,
} from "@tissuumaps/storage";

import { type TissUUmapsStateCreator } from "./index";

export type AppSlice = AppSliceState & AppSliceActions;

export type AppSliceState = {
  dark: boolean;
  workspace: FileSystemDirectoryHandle | null;
  imageDataLoaderFactories: Map<string, ImageDataLoaderFactory>;
  labelsDataLoaderFactories: Map<string, LabelsDataLoaderFactory>;
  pointsDataLoaderFactories: Map<string, PointsDataLoaderFactory>;
  shapesDataLoaderFactories: Map<string, ShapesDataLoaderFactory>;
  tableDataLoaderFactories: Map<string, TableDataLoaderFactory>;
};

export type AppSliceActions = {
  setDark: (dark: boolean) => void;
  setWorkspace: (workspace: FileSystemDirectoryHandle | null) => void;
  registerImageDataLoader: (
    imageDataSourceType: string,
    imageDataLoaderFactory: ImageDataLoaderFactory,
  ) => void;
  registerLabelsDataLoader: (
    labelsDataSourceType: string,
    labelsDataLoaderFactory: LabelsDataLoaderFactory,
  ) => void;
  registerPointsDataLoader: (
    pointsDataSourceType: string,
    pointsDataLoaderFactory: PointsDataLoaderFactory,
  ) => void;
  registerShapesDataLoader: (
    shapesDataSourceType: string,
    shapesDataLoaderFactory: ShapesDataLoaderFactory,
  ) => void;
  registerTableDataLoader: (
    tableDataSourceType: string,
    tableDataLoaderFactory: TableDataLoaderFactory,
  ) => void;
};

export const createAppSlice: TissUUmapsStateCreator<AppSlice> = (set) => ({
  ...initialAppSliceState,
  setDark: (dark) => {
    set((draft) => {
      draft.dark = dark;
    });
  },
  setWorkspace: (dir) => {
    set((draft) => {
      draft.workspace = dir;
    });
    // TODO reload data if necessary
  },
  registerImageDataLoader: (imageDataSourceType, imageDataLoaderFactory) => {
    set((draft) => {
      draft.imageDataLoaderFactories.set(
        imageDataSourceType,
        imageDataLoaderFactory,
      );
    });
  },
  registerLabelsDataLoader: (labelsDataSourceType, labelsDataLoaderFactory) => {
    set((draft) => {
      draft.labelsDataLoaderFactories.set(
        labelsDataSourceType,
        labelsDataLoaderFactory,
      );
    });
  },
  registerPointsDataLoader: (pointsDataSourceType, pointsDataLoaderFactory) => {
    set((draft) => {
      draft.pointsDataLoaderFactories.set(
        pointsDataSourceType,
        pointsDataLoaderFactory,
      );
    });
  },
  registerShapesDataLoader: (shapesDataSourceType, shapesDataLoaderFactory) => {
    set((draft) => {
      draft.shapesDataLoaderFactories.set(
        shapesDataSourceType,
        shapesDataLoaderFactory,
      );
    });
  },
  registerTableDataLoader: (tableDataSourceType, tableDataLoaderFactory) => {
    set((draft) => {
      draft.tableDataLoaderFactories.set(
        tableDataSourceType,
        tableDataLoaderFactory,
      );
    });
  },
});

const initialAppSliceState: AppSliceState = {
  dark: false,
  workspace: null,
  imageDataLoaderFactories: new Map<string, ImageDataLoaderFactory>([
    [
      openSeadragonImageDataSourceType,
      (rawDataSource, workspace) =>
        new OpenSeadragonImageDataLoader(
          createOpenSeadragonImageDataSource(
            rawDataSource as RawOpenSeadragonImageDataSource,
          ),
          workspace,
        ),
    ],
  ]),
  labelsDataLoaderFactories: new Map<string, LabelsDataLoaderFactory>([]),
  pointsDataLoaderFactories: new Map<string, PointsDataLoaderFactory>([
    [
      tablePointsDataSourceType,
      (rawDataSource, workspace, loadTable) =>
        new TablePointsDataLoader(
          createTablePointsDataSource(
            rawDataSource as RawTablePointsDataSource,
          ),
          workspace,
          loadTable,
        ),
    ],
  ]),
  shapesDataLoaderFactories: new Map<string, ShapesDataLoaderFactory>([
    [
      geoJSONShapesDataSourceType,
      (rawDataSource, workspace) =>
        new GeoJSONShapesDataLoader(
          createGeoJSONShapesDataSource(
            rawDataSource as RawGeoJSONShapesDataSource,
          ),
          workspace,
        ),
    ],
  ]),
  tableDataLoaderFactories: new Map<string, TableDataLoaderFactory>([
    [
      csvTableDataSourceType,
      (rawDataSource, workspace) =>
        new CSVTableDataLoader(
          createCSVTableDataSource(rawDataSource as RawCSVTableDataSource),
          workspace,
        ),
    ],
    [
      parquetTableDataSourceType,
      (rawDataSource, workspace) =>
        new ParquetTableDataLoader(
          createParquetTableDataSource(
            rawDataSource as RawParquetTableDataSource,
          ),
          workspace,
        ),
    ],
  ]),
};

type ImageDataLoaderFactory = (
  rawDataSource: RawImageDataSource,
  workspace: FileSystemDirectoryHandle | null,
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => ImageDataLoader<ImageData>;

type LabelsDataLoaderFactory = (
  dataSource: RawLabelsDataSource,
  workspace: FileSystemDirectoryHandle | null,
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => LabelsDataLoader<LabelsData>;

export type PointsDataLoaderFactory = (
  dataSource: RawPointsDataSource,
  workspace: FileSystemDirectoryHandle | null,
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => PointsDataLoader<PointsData>;

export type ShapesDataLoaderFactory = (
  dataSource: RawShapesDataSource,
  workspace: FileSystemDirectoryHandle | null,
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => ShapesDataLoader<ShapesData>;

export type TableDataLoaderFactory = (
  dataSource: RawTableDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => TableDataLoader<TableData>;
