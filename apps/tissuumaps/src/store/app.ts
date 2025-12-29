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
  projectDir: FileSystemDirectoryHandle | null;
  imageDataLoaderFactories: Map<string, ImageDataLoaderFactory>;
  labelsDataLoaderFactories: Map<string, LabelsDataLoaderFactory>;
  pointsDataLoaderFactories: Map<string, PointsDataLoaderFactory>;
  shapesDataLoaderFactories: Map<string, ShapesDataLoaderFactory>;
  tableDataLoaderFactories: Map<string, TableDataLoaderFactory>;
};

export type AppSliceActions = {
  setProjectDir: (dir: FileSystemDirectoryHandle | null) => void;
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
  setProjectDir: (dir) => {
    set((draft) => {
      draft.projectDir = dir;
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
  projectDir: null,
  imageDataLoaderFactories: new Map<string, ImageDataLoaderFactory>([
    [
      openSeadragonImageDataSourceType,
      (rawDataSource, projectDir) =>
        new OpenSeadragonImageDataLoader(
          createOpenSeadragonImageDataSource(
            rawDataSource as RawOpenSeadragonImageDataSource,
          ),
          projectDir,
        ),
    ],
  ]),
  labelsDataLoaderFactories: new Map<string, LabelsDataLoaderFactory>([]),
  pointsDataLoaderFactories: new Map<string, PointsDataLoaderFactory>([
    [
      tablePointsDataSourceType,
      (rawDataSource, projectDir, loadTable) =>
        new TablePointsDataLoader(
          createTablePointsDataSource(
            rawDataSource as RawTablePointsDataSource,
          ),
          projectDir,
          loadTable,
        ),
    ],
  ]),
  shapesDataLoaderFactories: new Map<string, ShapesDataLoaderFactory>([
    [
      geoJSONShapesDataSourceType,
      (rawDataSource, projectDir) =>
        new GeoJSONShapesDataLoader(
          createGeoJSONShapesDataSource(
            rawDataSource as RawGeoJSONShapesDataSource,
          ),
          projectDir,
        ),
    ],
  ]),
  tableDataLoaderFactories: new Map<string, TableDataLoaderFactory>([
    [
      csvTableDataSourceType,
      (rawDataSource, projectDir) =>
        new CSVTableDataLoader(
          createCSVTableDataSource(rawDataSource as RawCSVTableDataSource),
          projectDir,
        ),
    ],
    [
      parquetTableDataSourceType,
      (rawDataSource, projectDir) =>
        new ParquetTableDataLoader(
          createParquetTableDataSource(
            rawDataSource as RawParquetTableDataSource,
          ),
          projectDir,
        ),
    ],
  ]),
};

type ImageDataLoaderFactory = (
  rawDataSource: RawImageDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => ImageDataLoader<ImageData>;

type LabelsDataLoaderFactory = (
  dataSource: RawLabelsDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => LabelsDataLoader<LabelsData>;

export type PointsDataLoaderFactory = (
  dataSource: RawPointsDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => PointsDataLoader<PointsData>;

export type ShapesDataLoaderFactory = (
  dataSource: RawShapesDataSource,
  projectDir: FileSystemDirectoryHandle | null,
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>,
) => ShapesDataLoader<ShapesData>;

export type TableDataLoaderFactory = (
  dataSource: RawTableDataSource,
  projectDir: FileSystemDirectoryHandle | null,
) => TableDataLoader<TableData>;
