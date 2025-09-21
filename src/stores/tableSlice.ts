import {
  CSVTableDataLoader,
  CSV_TABLE_DATA_SOURCE,
  ICSVTableDataSourceModel,
} from "../data/loaders/csv";
import {
  IParquetTableDataSourceModel,
  PARQUET_TABLE_DATA_SOURCE,
  ParquetTableDataLoader,
} from "../data/loaders/parquet";
import { ITableData, ITableDataLoader } from "../data/table";
import { ITableDataSourceModel, ITableModel } from "../models/table";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

type TableDataLoaderFactory = (
  dataSource: ITableDataSourceModel,
  projectDir: FileSystemDirectoryHandle | null,
) => ITableDataLoader<ITableData>;

export type TableSlice = TableSliceState & TableSliceActions;

export type TableSliceState = {
  tableMap: Map<string, ITableModel>;
  tableDataCache: Map<ITableDataSourceModel, ITableData>;
  tableDataLoaderFactories: Map<string, TableDataLoaderFactory>;
};

export type TableSliceActions = {
  setTable: (table: ITableModel, index?: number) => void;
  loadTable: (table: ITableModel, signal?: AbortSignal) => Promise<ITableData>;
  loadTableByID: (tableId: string, signal?: AbortSignal) => Promise<ITableData>;
  deleteTable: (table: ITableModel) => void;
};

export const createTableSlice: BoundStoreStateCreator<TableSlice> = (
  set,
  get,
) => ({
  ...initialTableSliceState,
  setTable: (table, index) => {
    set((draft) => {
      const oldTable = draft.tableMap.get(table.id);
      draft.tableMap = MapUtils.cloneAndSpliceSet(
        draft.tableMap,
        table.id,
        table,
        index,
      );
      if (oldTable !== undefined) {
        draft.tableDataCache.delete(oldTable.dataSource);
      }
    });
  },
  loadTable: async (table, signal) => {
    signal?.throwIfAborted();
    const state = get();
    let tableData = state.tableDataCache.get(table.dataSource);
    if (tableData !== undefined) {
      return tableData;
    }
    const tableDataLoaderFactory = state.tableDataLoaderFactories.get(
      table.dataSource.type,
    );
    if (tableDataLoaderFactory === undefined) {
      throw new Error(
        `No table data loader found for type ${table.dataSource.type}.`,
      );
    }
    const tableDataLoader = tableDataLoaderFactory(
      table.dataSource,
      state.projectDir,
    );
    tableData = await tableDataLoader.loadTable(signal);
    signal?.throwIfAborted();
    set((draft) => {
      draft.tableDataCache.set(table.dataSource, tableData);
    });
    return tableData;
  },
  loadTableByID: async (tableId, signal) => {
    signal?.throwIfAborted();
    const state = get();
    const table = state.tableMap.get(tableId);
    if (table === undefined) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    return state.loadTable(table, signal);
  },
  deleteTable: (table) => {
    set((draft) => {
      draft.tableMap.delete(table.id);
      draft.tableDataCache.delete(table.dataSource);
    });
  },
});

const initialTableSliceState: TableSliceState = {
  // TODO remove test data
  tableMap: new Map<string, ITableModel>([
    [
      "iss",
      {
        id: "iss",
        name: "ISS",
        dataSource: {
          type: "csv",
          url: "/data/breast/TissueA.csv",
          loadColumns: ["global_X_pos", "global_Y_pos"],
        } as ICSVTableDataSourceModel,
      },
    ],
  ]),
  tableDataCache: new Map<ITableDataSourceModel, ITableData>(),
  tableDataLoaderFactories: new Map<string, TableDataLoaderFactory>([
    [
      CSV_TABLE_DATA_SOURCE,
      (dataSource, projectDir) =>
        new CSVTableDataLoader(
          dataSource as ICSVTableDataSourceModel,
          projectDir,
        ),
    ],
    [
      PARQUET_TABLE_DATA_SOURCE,
      (dataSource, projectDir) =>
        new ParquetTableDataLoader(
          dataSource as IParquetTableDataSourceModel,
          projectDir,
        ),
    ],
  ]),
};
