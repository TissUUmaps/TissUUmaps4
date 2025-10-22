import { TableData } from "../data/table";
import { CompleteTable, CompleteTableDataSource } from "../model/table";
import MapUtils from "../utils/MapUtils";
import { BoundStoreStateCreator } from "./boundStore";

export type TableSlice = TableSliceState & TableSliceActions;

export type TableSliceState = {
  tableMap: Map<string, CompleteTable>;
  tableDataCache: Map<CompleteTableDataSource, TableData>;
};

export type TableSliceActions = {
  addTable: (table: CompleteTable, index?: number) => void;
  loadTable: (
    table: CompleteTable,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>;
  loadTableByID: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>;
  unloadTable: (table: CompleteTable) => void;
  unloadTableByID: (tableId: string) => void;
  deleteTable: (table: CompleteTable) => void;
  deleteTableByID: (tableId: string) => void;
  clearTables: () => void;
};

export const createTableSlice: BoundStoreStateCreator<TableSlice> = (
  set,
  get,
) => ({
  ...initialTableSliceState,
  addTable: (table, index) => {
    const state = get();
    const oldTable = state.tableMap.get(table.id);
    if (oldTable !== undefined) {
      state.unloadTable(oldTable);
    }
    set((draft) => {
      draft.tableMap = MapUtils.cloneAndSpliceSet(
        draft.tableMap,
        table.id,
        table,
        index,
      );
    });
  },
  loadTable: async (table, options: { signal?: AbortSignal } = {}) => {
    const { signal } = options;
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
    tableData = await tableDataLoader.loadTable({ signal });
    signal?.throwIfAborted();
    set((draft) => {
      draft.tableDataCache.set(table.dataSource, tableData);
    });
    return tableData;
  },
  loadTableByID: async (tableId, options: { signal?: AbortSignal } = {}) => {
    const { signal } = options;
    signal?.throwIfAborted();
    const state = get();
    const table = state.tableMap.get(tableId);
    if (table === undefined) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    return state.loadTable(table, { signal });
  },
  unloadTable: (table) => {
    const state = get();
    const tableData = state.tableDataCache.get(table.dataSource);
    set((draft) => {
      draft.tableDataCache.delete(table.dataSource);
    });
    tableData?.destroy();
  },
  unloadTableByID: (tableId) => {
    const state = get();
    const table = state.tableMap.get(tableId);
    if (table === undefined) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    state.unloadTable(table);
  },
  deleteTable: (table) => {
    const state = get();
    state.unloadTable(table);
    set((draft) => {
      draft.tableMap.delete(table.id);
    });
  },
  deleteTableByID: (tableId) => {
    const state = get();
    const table = state.tableMap.get(tableId);
    if (table === undefined) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    state.deleteTable(table);
  },
  clearTables: () => {
    const state = get();
    state.tableMap.forEach((table) => {
      state.deleteTable(table);
    });
    set(initialTableSliceState);
  },
});

const initialTableSliceState: TableSliceState = {
  tableMap: new Map(),
  tableDataCache: new Map(),
};
