import { LoadedTableDataAdapter } from "@/adapters/LoadedTableDataAdapter";
import { type JsonSchema, type UISchemaElement } from "@jsonforms/core";

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
  csvTableDataSourceSchema,
  csvTableDataSourceType,
  csvTableDataSourceUISchema,
  geoJSONShapesDataSourceSchema,
  geoJSONShapesDataSourceType,
  geoJSONShapesDataSourceUISchema,
  openSeadragonImageDataSourceSchema,
  openSeadragonImageDataSourceType,
  openSeadragonImageDataSourceUISchema,
  parquetTableDataSourceSchema,
  parquetTableDataSourceType,
  parquetTableDataSourceUISchema,
  tablePointsDataSourceSchema,
  tablePointsDataSourceType,
  tablePointsDataSourceUISchema,
} from "@tissuumaps/storage";

import { type TissUUmapsStateCreator, useTissUUmaps } from "../index";

type ImageDataLoaderFactory = (
  rawDataSource: RawImageDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => ImageDataLoader<ImageData>;

type LabelsDataLoaderFactory = (
  dataSource: RawLabelsDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => LabelsDataLoader<LabelsData>;

type PointsDataLoaderFactory = (
  dataSource: RawPointsDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => PointsDataLoader<PointsData>;

type ShapesDataLoaderFactory = (
  dataSource: RawShapesDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => ShapesDataLoader<ShapesData>;

type TableDataLoaderFactory = (
  dataSource: RawTableDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => TableDataLoader<TableData>;

type DataLoaderRegistryValue<TDataLoaderFactory> = {
  dataSourceSchema: JsonSchema;
  dataSourceUISchema: UISchemaElement;
  dataLoaderFactory: TDataLoaderFactory;
};

export type AppSlice = AppSliceState & AppSliceActions;

export type AppSliceState = {
  dark: boolean;
  workspace: FileSystemDirectoryHandle | null;
  imageDataLoaderRegistry: Map<
    string,
    DataLoaderRegistryValue<ImageDataLoaderFactory>
  >;
  labelsDataLoaderRegistry: Map<
    string,
    DataLoaderRegistryValue<LabelsDataLoaderFactory>
  >;
  pointsDataLoaderRegistry: Map<
    string,
    DataLoaderRegistryValue<PointsDataLoaderFactory>
  >;
  shapesDataLoaderRegistry: Map<
    string,
    DataLoaderRegistryValue<ShapesDataLoaderFactory>
  >;
  tableDataLoaderRegistry: Map<
    string,
    DataLoaderRegistryValue<TableDataLoaderFactory>
  >;
};

export type AppSliceActions = {
  setDark: (dark: boolean) => void;
  setWorkspace: (workspace: FileSystemDirectoryHandle | null) => void;
  registerImageDataLoader: (
    type: string,
    value: DataLoaderRegistryValue<ImageDataLoaderFactory>,
  ) => void;
  registerLabelsDataLoader: (
    type: string,
    value: DataLoaderRegistryValue<LabelsDataLoaderFactory>,
  ) => void;
  registerPointsDataLoader: (
    type: string,
    value: DataLoaderRegistryValue<PointsDataLoaderFactory>,
  ) => void;
  registerShapesDataLoader: (
    type: string,
    value: DataLoaderRegistryValue<ShapesDataLoaderFactory>,
  ) => void;
  registerTableDataLoader: (
    type: string,
    value: DataLoaderRegistryValue<TableDataLoaderFactory>,
  ) => void;
};

export const createAppSlice: TissUUmapsStateCreator<AppSlice> = (set) => ({
  ...createInitialAppSliceState(),
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
  registerImageDataLoader: (type, value) => {
    set((draft) => {
      draft.imageDataLoaderRegistry.set(type, value);
    });
  },
  registerLabelsDataLoader: (type, value) => {
    set((draft) => {
      draft.labelsDataLoaderRegistry.set(type, value);
    });
  },
  registerPointsDataLoader: (type, value) => {
    set((draft) => {
      draft.pointsDataLoaderRegistry.set(type, value);
    });
  },
  registerShapesDataLoader: (type, value) => {
    set((draft) => {
      draft.shapesDataLoaderRegistry.set(type, value);
    });
  },
  registerTableDataLoader: (type, value) => {
    set((draft) => {
      draft.tableDataLoaderRegistry.set(type, value);
    });
  },
});

function createInitialAppSliceState(): AppSliceState {
  return {
    dark: false,
    workspace: null,
    imageDataLoaderRegistry: new Map([
      [
        openSeadragonImageDataSourceType,
        {
          dataSourceSchema: openSeadragonImageDataSourceSchema,
          dataSourceUISchema: openSeadragonImageDataSourceUISchema,
          dataLoaderFactory: (rawDataSource, workspace) =>
            new OpenSeadragonImageDataLoader(
              createOpenSeadragonImageDataSource(
                rawDataSource as RawOpenSeadragonImageDataSource,
              ),
              workspace,
            ),
        },
      ],
    ]),
    labelsDataLoaderRegistry: new Map([]),
    pointsDataLoaderRegistry: new Map([
      [
        tablePointsDataSourceType,
        {
          dataSourceSchema: tablePointsDataSourceSchema,
          dataSourceUISchema: tablePointsDataSourceUISchema,
          dataLoaderFactory: (rawDataSource, workspace) =>
            new TablePointsDataLoader(
              createTablePointsDataSource(
                rawDataSource as RawTablePointsDataSource,
              ),
              workspace,
              async (tableId, options) => {
                const { signal, onProgress } = options ?? {};
                signal?.throwIfAborted();
                const state = useTissUUmaps.getState();
                await state.loadTable(tableId, { signal, onProgress });
                signal?.throwIfAborted();
                return new LoadedTableDataAdapter(tableId);
              },
            ),
        },
      ],
    ]),
    shapesDataLoaderRegistry: new Map([
      [
        geoJSONShapesDataSourceType,
        {
          dataSourceSchema: geoJSONShapesDataSourceSchema,
          dataSourceUISchema: geoJSONShapesDataSourceUISchema,
          dataLoaderFactory: (rawDataSource, workspace) =>
            new GeoJSONShapesDataLoader(
              createGeoJSONShapesDataSource(
                rawDataSource as RawGeoJSONShapesDataSource,
              ),
              workspace,
            ),
        },
      ],
    ]),
    tableDataLoaderRegistry: new Map([
      [
        csvTableDataSourceType,
        {
          dataSourceSchema: csvTableDataSourceSchema,
          dataSourceUISchema: csvTableDataSourceUISchema,
          dataLoaderFactory: (rawDataSource, workspace) =>
            new CSVTableDataLoader(
              createCSVTableDataSource(rawDataSource as RawCSVTableDataSource),
              workspace,
            ),
        },
      ],
      [
        parquetTableDataSourceType,
        {
          dataSourceSchema: parquetTableDataSourceSchema,
          dataSourceUISchema: parquetTableDataSourceUISchema,
          dataLoaderFactory: (rawDataSource, workspace) =>
            new ParquetTableDataLoader(
              createParquetTableDataSource(
                rawDataSource as RawParquetTableDataSource,
              ),
              workspace,
            ),
        },
      ],
    ]),
  };
}
