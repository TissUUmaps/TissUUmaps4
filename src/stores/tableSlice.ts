import { ITableData, ITableDataLoader } from "../data/table";
import { ITableModel } from "../models/table";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type TableSlice = TableSliceState & TableSliceActions;

export type TableSliceState = {
  tables: Map<string, ITableModel>;
  tableData: Map<string, ITableData>;
  tableDataLoaders: Map<string, ITableDataLoader>;
};

export type TableSliceActions = {
  setTable: (tableId: string, table: ITableModel, tableIndex?: number) => void;
  loadTable: (tableId: string, table?: ITableModel) => Promise<ITableData>;
  deleteTable: (tableId: string) => void;
  registerTableDataLoader: (
    tableDataSourceType: string,
    tableDataLoader: ITableDataLoader,
  ) => void;
  unregisterTableDataLoader: (tableDataSourceType: string) => void;
};

export const createTableSlice: BoundStoreStateCreator<TableSlice> = (
  set,
  get,
) => ({
  ...initialTableSliceState,
  setTable: (tableId, table, tableIndex) => {
    set((draft) => {
      draft.tables = MapUtils.cloneAndSet(
        draft.tables,
        tableId,
        table,
        tableIndex,
      );
    });
  },
  loadTable: async (tableId, table) => {
    const state = get();
    if (state.tableData.has(tableId)) {
      return state.tableData.get(tableId)!;
    }
    if (table === undefined) {
      table = state.tables.get(tableId);
      if (table === undefined) {
        throw new Error(`No table found for ID: ${tableId}`);
      }
    }
    const tableDataLoader = state.tableDataLoaders.get(table.dataSource.type);
    if (tableDataLoader === undefined) {
      throw new Error(
        `No table data loader registered for table data source type: ${table.dataSource.type}`,
      );
    }
    const tableData = await tableDataLoader.loadTable(table.dataSource);
    set((draft) => {
      draft.tableData.set(tableId, tableData);
    });
    return tableData;
  },
  deleteTable: (tableId) => {
    set((draft) => {
      draft.tables.delete(tableId);
      draft.tableData.delete(tableId);
    });
  },
  registerTableDataLoader: (tableDataSourceType, tableDataLoader) => {
    set((draft) => {
      if (draft.tableDataLoaders.has(tableDataSourceType)) {
        console.warn(
          `Table data loader was already registered for table data source type: ${tableDataSourceType}`,
        );
      }
      draft.tableDataLoaders.set(tableDataSourceType, tableDataLoader);
    });
  },
  unregisterTableDataLoader: (tableDataSourceType) => {
    set((draft) => {
      if (!draft.tableDataLoaders.delete(tableDataSourceType)) {
        console.warn(
          `No table data loader registered for table data source type: ${tableDataSourceType}`,
        );
      }
    });
  },
});

const initialTableSliceState: TableSliceState = {
  tables: new Map<string, ITableModel>(),
  tableData: new Map<string, ITableData>(),
  tableDataLoaders: new Map<string, ITableDataLoader>(),
};
