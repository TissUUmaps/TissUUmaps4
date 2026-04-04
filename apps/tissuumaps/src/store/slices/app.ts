import {
  type ImageData,
  type ImageDataProvider,
  type ImageDataSource,
  type InteractionMode,
  type LabelsData,
  type LabelsDataProvider,
  type LabelsDataSource,
  type PointsData,
  type PointsDataProvider,
  type PointsDataSource,
  type ShapesData,
  type ShapesDataProvider,
  type ShapesDataSource,
  type TableData,
  type TableDataProvider,
  type TableDataSource,
} from "@tissuumaps/core";
import {
  CSVTableDataProvider,
  GeoJSONShapesDataProvider,
  OpenSeadragonImageDataProvider,
  ParquetTableDataProvider,
  TablePointsDataProvider,
  csvTableDataSourceType,
  geoJSONShapesDataSourceType,
  openSeadragonImageDataSourceType,
  parquetTableDataSourceType,
  tablePointsDataSourceType,
} from "@tissuumaps/storage";

import { LoadedTableDataAdapter } from "../adapters/LoadedTableDataAdapter";
import { type TissUUmapsStateCreator, useTissUUmaps } from "../index";

export type AppSlice = AppSliceState & AppSliceActions;

export type AppSliceState = {
  dark: boolean;
  workspace: FileSystemDirectoryHandle | null;
  interactionMode: InteractionMode;
  imageDataProviders: Map<
    string,
    ImageDataProvider<ImageDataSource, ImageData>
  >;
  labelsDataProviders: Map<
    string,
    LabelsDataProvider<LabelsDataSource, LabelsData>
  >;
  pointsDataProviders: Map<
    string,
    PointsDataProvider<PointsDataSource, PointsData>
  >;
  shapesDataProviders: Map<
    string,
    ShapesDataProvider<ShapesDataSource, ShapesData>
  >;
  tableDataProviders: Map<
    string,
    TableDataProvider<TableDataSource, TableData>
  >;
};

export type AppSliceActions = {
  setDark: (dark: boolean) => void;
  setInteractionMode: (interactionMode: InteractionMode) => void;
  setWorkspace: (workspace: FileSystemDirectoryHandle | null) => void;
  registerImageDataProvider: (
    type: string,
    dataProvider: ImageDataProvider<ImageDataSource, ImageData>,
  ) => void;
  registerLabelsDataProvider: (
    type: string,
    dataProvider: LabelsDataProvider<LabelsDataSource, LabelsData>,
  ) => void;
  registerPointsDataProvider: (
    type: string,
    dataProvider: PointsDataProvider<PointsDataSource, PointsData>,
  ) => void;
  registerShapesDataProvider: (
    type: string,
    dataProvider: ShapesDataProvider<ShapesDataSource, ShapesData>,
  ) => void;
  registerTableDataProvider: (
    type: string,
    dataProvider: TableDataProvider<TableDataSource, TableData>,
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
  registerImageDataProvider: (type, dataProvider) => {
    set((draft) => {
      draft.imageDataProviders.set(type, dataProvider);
    });
  },
  registerLabelsDataProvider: (type, dataProvider) => {
    set((draft) => {
      draft.labelsDataProviders.set(type, dataProvider);
    });
  },
  registerPointsDataProvider: (type, dataProvider) => {
    set((draft) => {
      draft.pointsDataProviders.set(type, dataProvider);
    });
  },
  registerShapesDataProvider: (type, dataProvider) => {
    set((draft) => {
      draft.shapesDataProviders.set(type, dataProvider);
    });
  },
  registerTableDataProvider: (type, dataProvider) => {
    set((draft) => {
      draft.tableDataProviders.set(type, dataProvider);
    });
  },
});

function createInitialAppSliceState(): AppSliceState {
  return {
    dark: false,
    workspace: null,
    interactionMode: "pan",
    imageDataProviders: new Map<
      string,
      ImageDataProvider<ImageDataSource, ImageData>
    >([
      [openSeadragonImageDataSourceType, new OpenSeadragonImageDataProvider()],
    ]),
    labelsDataProviders: new Map<
      string,
      LabelsDataProvider<LabelsDataSource, LabelsData>
    >([]),
    pointsDataProviders: new Map<
      string,
      PointsDataProvider<PointsDataSource, PointsData>
    >([
      [
        tablePointsDataSourceType,
        new TablePointsDataProvider(async (tableId, options) => {
          const { signal, onProgress } = options ?? {};
          signal?.throwIfAborted();
          const state = useTissUUmaps.getState();
          await state.loadTable(tableId, { signal, onProgress });
          signal?.throwIfAborted();
          return new LoadedTableDataAdapter(tableId);
        }),
      ],
    ]),
    shapesDataProviders: new Map<
      string,
      ShapesDataProvider<ShapesDataSource, ShapesData>
    >([[geoJSONShapesDataSourceType, new GeoJSONShapesDataProvider()]]),
    tableDataProviders: new Map<
      string,
      TableDataProvider<TableDataSource, TableData>
    >([
      [csvTableDataSourceType, new CSVTableDataProvider()],
      [parquetTableDataSourceType, new ParquetTableDataProvider()],
    ]),
  };
}
