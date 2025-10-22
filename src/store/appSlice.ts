import { ImageDataLoaderFactory } from "../data/image";
import { LabelsDataLoaderFactory } from "../data/labels";
import {
  CSVTableDataLoader,
  CSVTableDataSource,
  CSV_TABLE_DATA_SOURCE,
  completeCSVTableDataSource,
} from "../data/loaders/csv";
import {
  DEFAULT_IMAGE_DATA_SOURCE,
  DefaultImageDataLoader,
  DefaultImageDataSource,
  completeDefaultImageDataSource,
} from "../data/loaders/default";
import {
  GEOJSON_SHAPES_DATA_SOURCE,
  GeoJSONShapesDataLoader,
  GeoJSONShapesDataSource,
  completeGeoJSONShapesDataSource,
} from "../data/loaders/geojson";
import {
  PARQUET_TABLE_DATA_SOURCE,
  ParquetTableDataLoader,
  ParquetTableDataSource,
  completeParquetTableDataSource,
} from "../data/loaders/parquet";
import {
  TABLE_POINTS_DATA_SOURCE,
  TablePointsDataLoader,
  TablePointsDataSource,
  completeTablePointsDataSource,
} from "../data/loaders/table";
import {
  TIFFLabelsDataLoader,
  TIFFLabelsDataSource,
  TIFF_LABELS_DATA_SOURCE,
  completeTIFFLabelsDataSource,
} from "../data/loaders/tiff";
import {
  ZARR_LABELS_DATA_SOURCE,
  ZarrLabelsDataLoader,
  ZarrLabelsDataSource,
  completeZarrLabelsDataSource,
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
          completeDefaultImageDataSource(dataSource as DefaultImageDataSource),
          projectDir,
        ),
    ],
  ]),
  labelsDataLoaderFactories: new Map<string, LabelsDataLoaderFactory>([
    [
      TIFF_LABELS_DATA_SOURCE,
      (dataSource, projectDir) =>
        new TIFFLabelsDataLoader(
          completeTIFFLabelsDataSource(dataSource as TIFFLabelsDataSource),
          projectDir,
        ),
    ],
    [
      ZARR_LABELS_DATA_SOURCE,
      (dataSource, projectDir) =>
        new ZarrLabelsDataLoader(
          completeZarrLabelsDataSource(dataSource as ZarrLabelsDataSource),
          projectDir,
        ),
    ],
  ]),
  pointsDataLoaderFactories: new Map<string, PointsDataLoaderFactory>([
    [
      TABLE_POINTS_DATA_SOURCE,
      (dataSource, projectDir, loadTableByID) =>
        new TablePointsDataLoader(
          completeTablePointsDataSource(dataSource as TablePointsDataSource),
          projectDir,
          loadTableByID,
        ),
    ],
  ]),
  shapesDataLoaderFactories: new Map<string, ShapesDataLoaderFactory>([
    [
      GEOJSON_SHAPES_DATA_SOURCE,
      (dataSource, projectDir) =>
        new GeoJSONShapesDataLoader(
          completeGeoJSONShapesDataSource(
            dataSource as GeoJSONShapesDataSource,
          ),
          projectDir,
        ),
    ],
  ]),
  tableDataLoaderFactories: new Map<string, TableDataLoaderFactory>([
    [
      CSV_TABLE_DATA_SOURCE,
      (dataSource, projectDir) =>
        new CSVTableDataLoader(
          completeCSVTableDataSource(dataSource as CSVTableDataSource),
          projectDir,
        ),
    ],
    [
      PARQUET_TABLE_DATA_SOURCE,
      (dataSource, projectDir) =>
        new ParquetTableDataLoader(
          completeParquetTableDataSource(dataSource as ParquetTableDataSource),
          projectDir,
        ),
    ],
  ]),
};
