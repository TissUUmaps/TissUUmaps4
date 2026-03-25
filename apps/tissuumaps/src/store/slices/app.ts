import { type JsonSchema, type UISchemaElement } from "@jsonforms/core";

import {
  type ImageData,
  type ImageDataStorage,
  type LabelsData,
  type LabelsDataStorage,
  type PointsData,
  type PointsDataStorage,
  type RawImageDataSource,
  type RawLabelsDataSource,
  type RawPointsDataSource,
  type RawShapesDataSource,
  type RawTableDataSource,
  type ShapesData,
  type ShapesDataStorage,
  type TableData,
  type TableDataStorage,
} from "@tissuumaps/core";
import { type InteractionMode } from "@tissuumaps/core";
import {
  CSVTableDataStorage,
  GeoJSONShapesDataStorage,
  OpenSeadragonImageDataStorage,
  ParquetTableDataStorage,
  type RawCSVTableDataSource,
  type RawGeoJSONShapesDataSource,
  type RawOpenSeadragonImageDataSource,
  type RawParquetTableDataSource,
  type RawTablePointsDataSource,
  TablePointsDataStorage,
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

import { LoadedTableDataAdapter } from "../adapters/LoadedTableDataAdapter";
import { type TissUUmapsStateCreator, useTissUUmaps } from "../index";

type ImageDataStorageFactory = (
  rawDataSource: RawImageDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => ImageDataStorage<ImageData>;

type LabelsDataStorageFactory = (
  dataSource: RawLabelsDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => LabelsDataStorage<LabelsData>;

type PointsDataStorageFactory = (
  dataSource: RawPointsDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => PointsDataStorage<PointsData>;

type ShapesDataStorageFactory = (
  dataSource: RawShapesDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => ShapesDataStorage<ShapesData>;

type TableDataStorageFactory = (
  dataSource: RawTableDataSource,
  workspace: FileSystemDirectoryHandle | null,
) => TableDataStorage<TableData>;

type DataStorageRegistryValue<TStorageFactory> = {
  dataSourceSchema: JsonSchema;
  dataSourceUISchema: UISchemaElement;
  dataStorageFactory: TStorageFactory;
};

export type AppSlice = AppSliceState & AppSliceActions;

export type AppSliceState = {
  dark: boolean;
  interactionMode: InteractionMode;
  workspace: FileSystemDirectoryHandle | null;
  imageDataStorageRegistry: Map<
    string,
    DataStorageRegistryValue<ImageDataStorageFactory>
  >;
  labelsDataStorageRegistry: Map<
    string,
    DataStorageRegistryValue<LabelsDataStorageFactory>
  >;
  pointsDataStorageRegistry: Map<
    string,
    DataStorageRegistryValue<PointsDataStorageFactory>
  >;
  shapesDataStorageRegistry: Map<
    string,
    DataStorageRegistryValue<ShapesDataStorageFactory>
  >;
  tableDataStorageRegistry: Map<
    string,
    DataStorageRegistryValue<TableDataStorageFactory>
  >;
};

export type AppSliceActions = {
  setDark: (dark: boolean) => void;
  setInteractionMode: (interactionMode: InteractionMode) => void;
  setWorkspace: (workspace: FileSystemDirectoryHandle | null) => void;
  registerImageDataStorage: (
    type: string,
    value: DataStorageRegistryValue<ImageDataStorageFactory>,
  ) => void;
  registerLabelsDataStorage: (
    type: string,
    value: DataStorageRegistryValue<LabelsDataStorageFactory>,
  ) => void;
  registerPointsDataStorage: (
    type: string,
    value: DataStorageRegistryValue<PointsDataStorageFactory>,
  ) => void;
  registerShapesDataStorage: (
    type: string,
    value: DataStorageRegistryValue<ShapesDataStorageFactory>,
  ) => void;
  registerTableDataStorage: (
    type: string,
    value: DataStorageRegistryValue<TableDataStorageFactory>,
  ) => void;
};

export const createAppSlice: TissUUmapsStateCreator<AppSlice> = (set) => ({
  ...createInitialAppSliceState(),
  setDark: (dark) => {
    set((draft) => {
      draft.dark = dark;
    });
  },
  setInteractionMode: (interactionMode) => {
    set((draft) => {
      draft.interactionMode = interactionMode;
    });
  },
  setWorkspace: (dir) => {
    set((draft) => {
      draft.workspace = dir;
    });
    // TODO reload data if necessary
  },
  registerImageDataStorage: (type, value) => {
    set((draft) => {
      draft.imageDataStorageRegistry.set(type, value);
    });
  },
  registerLabelsDataStorage: (type, value) => {
    set((draft) => {
      draft.labelsDataStorageRegistry.set(type, value);
    });
  },
  registerPointsDataStorage: (type, value) => {
    set((draft) => {
      draft.pointsDataStorageRegistry.set(type, value);
    });
  },
  registerShapesDataStorage: (type, value) => {
    set((draft) => {
      draft.shapesDataStorageRegistry.set(type, value);
    });
  },
  registerTableDataStorage: (type, value) => {
    set((draft) => {
      draft.tableDataStorageRegistry.set(type, value);
    });
  },
});

function createInitialAppSliceState(): AppSliceState {
  return {
    dark: false,
    interactionMode: "pan",
    workspace: null,
    imageDataStorageRegistry: new Map([
      [
        openSeadragonImageDataSourceType,
        {
          dataSourceSchema: openSeadragonImageDataSourceSchema,
          dataSourceUISchema: openSeadragonImageDataSourceUISchema,
          dataStorageFactory: (rawDataSource, workspace) =>
            new OpenSeadragonImageDataStorage(
              createOpenSeadragonImageDataSource(
                rawDataSource as RawOpenSeadragonImageDataSource,
              ),
              workspace,
            ),
        },
      ],
    ]),
    labelsDataStorageRegistry: new Map([]),
    pointsDataStorageRegistry: new Map([
      [
        tablePointsDataSourceType,
        {
          dataSourceSchema: tablePointsDataSourceSchema,
          dataSourceUISchema: tablePointsDataSourceUISchema,
          dataStorageFactory: (rawDataSource, workspace) =>
            new TablePointsDataStorage(
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
    shapesDataStorageRegistry: new Map([
      [
        geoJSONShapesDataSourceType,
        {
          dataSourceSchema: geoJSONShapesDataSourceSchema,
          dataSourceUISchema: geoJSONShapesDataSourceUISchema,
          dataStorageFactory: (rawDataSource, workspace) =>
            new GeoJSONShapesDataStorage(
              createGeoJSONShapesDataSource(
                rawDataSource as RawGeoJSONShapesDataSource,
              ),
              workspace,
            ),
        },
      ],
    ]),
    tableDataStorageRegistry: new Map([
      [
        csvTableDataSourceType,
        {
          dataSourceSchema: csvTableDataSourceSchema,
          dataSourceUISchema: csvTableDataSourceUISchema,
          dataStorageFactory: (rawDataSource, workspace) =>
            new CSVTableDataStorage(
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
          dataStorageFactory: (rawDataSource, workspace) =>
            new ParquetTableDataStorage(
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
