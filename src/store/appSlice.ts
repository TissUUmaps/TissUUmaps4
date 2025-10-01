import { ImageDataLoaderFactory } from "../data/image";
import { LabelsDataLoaderFactory } from "../data/labels";
import {
  CSVTableDataLoader,
  CSV_TABLE_DATA_SOURCE,
  RawCSVTableDataSource,
  createCSVTableDataSource,
} from "../data/loaders/csv";
import {
  DEFAULT_IMAGE_DATA_SOURCE,
  DefaultImageDataLoader,
  RawDefaultImageDataSource,
  createDefaultImageDataSource,
} from "../data/loaders/default";
import {
  PARQUET_TABLE_DATA_SOURCE,
  ParquetTableDataLoader,
  RawParquetTableDataSource,
  createParquetTableDataSource,
} from "../data/loaders/parquet";
import {
  RawTablePointsDataSource,
  TABLE_POINTS_DATA_SOURCE,
  TablePointsDataLoader,
  createTablePointsDataSource,
} from "../data/loaders/table";
import {
  RawTIFFLabelsDataSource,
  TIFFLabelsDataLoader,
  TIFF_LABELS_DATA_SOURCE,
  createTIFFLabelsDataSource,
} from "../data/loaders/tiff";
import {
  RawZarrLabelsDataSource,
  ZARR_LABELS_DATA_SOURCE,
  ZarrLabelsDataLoader,
  createZarrLabelsDataSource,
} from "../data/loaders/zarr";
import { PointsDataLoaderFactory } from "../data/points";
import { ShapesDataLoaderFactory } from "../data/shapes";
import { TableDataLoaderFactory } from "../data/table";
import { BoundStoreStateCreator } from "./boundStore";

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
    type: string,
    factory: ImageDataLoaderFactory,
  ) => void;
  registerLabelsDataLoader: (
    type: string,
    factory: LabelsDataLoaderFactory,
  ) => void;
  registerPointsDataLoader: (
    type: string,
    factory: PointsDataLoaderFactory,
  ) => void;
  registerShapesDataLoader: (
    type: string,
    factory: ShapesDataLoaderFactory,
  ) => void;
  registerTableDataLoader: (
    type: string,
    factory: TableDataLoaderFactory,
  ) => void;
};

export const createAppSlice: BoundStoreStateCreator<AppSlice> = (set) => ({
  ...initialAppSliceState,
  setProjectDir: (dir) => {
    set((draft) => {
      draft.projectDir = dir;
    });
    // TODO reload data if necessary
  },
  registerImageDataLoader: (type, factory) => {
    set((draft) => {
      draft.imageDataLoaderFactories.set(type, factory);
    });
  },
  registerLabelsDataLoader: (type, factory) => {
    set((draft) => {
      draft.labelsDataLoaderFactories.set(type, factory);
    });
  },
  registerPointsDataLoader: (type, factory) => {
    set((draft) => {
      draft.pointsDataLoaderFactories.set(type, factory);
    });
  },
  registerShapesDataLoader: (type, factory) => {
    set((draft) => {
      draft.shapesDataLoaderFactories.set(type, factory);
    });
  },
  registerTableDataLoader: (type, factory) => {
    set((draft) => {
      draft.tableDataLoaderFactories.set(type, factory);
    });
  },
});

const initialAppSliceState: AppSliceState = {
  projectDir: null,
  imageDataLoaderFactories: new Map<string, ImageDataLoaderFactory>([
    [
      DEFAULT_IMAGE_DATA_SOURCE,
      (dataSource, projectDir) =>
        new DefaultImageDataLoader(
          createDefaultImageDataSource(dataSource as RawDefaultImageDataSource),
          projectDir,
        ),
    ],
  ]),
  labelsDataLoaderFactories: new Map<string, LabelsDataLoaderFactory>([
    [
      TIFF_LABELS_DATA_SOURCE,
      (dataSource, projectDir) =>
        new TIFFLabelsDataLoader(
          createTIFFLabelsDataSource(dataSource as RawTIFFLabelsDataSource),
          projectDir,
        ),
    ],
    [
      ZARR_LABELS_DATA_SOURCE,
      (dataSource, projectDir) =>
        new ZarrLabelsDataLoader(
          createZarrLabelsDataSource(dataSource as RawZarrLabelsDataSource),
          projectDir,
        ),
    ],
  ]),
  pointsDataLoaderFactories: new Map<string, PointsDataLoaderFactory>([
    [
      TABLE_POINTS_DATA_SOURCE,
      (dataSource, projectDir, loadTableByID) =>
        new TablePointsDataLoader(
          createTablePointsDataSource(dataSource as RawTablePointsDataSource),
          projectDir,
          loadTableByID,
        ),
    ],
  ]),
  shapesDataLoaderFactories: new Map<string, ShapesDataLoaderFactory>(),
  tableDataLoaderFactories: new Map<string, TableDataLoaderFactory>([
    [
      CSV_TABLE_DATA_SOURCE,
      (dataSource, projectDir) =>
        new CSVTableDataLoader(
          createCSVTableDataSource(dataSource as RawCSVTableDataSource),
          projectDir,
        ),
    ],
    [
      PARQUET_TABLE_DATA_SOURCE,
      (dataSource, projectDir) =>
        new ParquetTableDataLoader(
          createParquetTableDataSource(dataSource as RawParquetTableDataSource),
          projectDir,
        ),
    ],
  ]),
};
