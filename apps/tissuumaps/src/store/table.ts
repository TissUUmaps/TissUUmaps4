import { deepEqual } from "fast-equals";

import {
  type MappableArrayLike,
  type Table,
  type TableData,
  type TableDataLoader,
  type TableDataSource,
} from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "./index";

export type LoadedTable = {
  data: TableData;
  loadedColumns: Map<string, LoadedTableColumn<unknown>>;
};

export type LoadedTableColumn<T> = {
  values: MappableArrayLike<T>;
  valueRange: [number, number] | undefined;
};

export type TableSlice = TableSliceState & TableSliceActions;

export type TableSliceState = {
  tables: Table[];
  loadedTables: Map<string, LoadedTable>;
  tableDataSourceCaches: { dataSource: TableDataSource; data: TableData }[];
};

export type TableSliceActions = {
  addTable: (table: Table, index?: number) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  moveTable: (tableId: string, newIndex: number) => void;
  deleteTable: (tableId: string) => void;
  clearTables: () => void;
  createTableDataLoader: (tableId: string) => TableDataLoader<TableData>;
  loadTable: (
    tableId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedTable>;
  loadTableColumn: <T>(
    tableId: string,
    column: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedTableColumn<T>>;
  unloadTableColumn: (tableId: string, column: string) => void;
  unloadTable: (tableId: string) => void;
};

export const createTableSlice: TissUUmapsStateCreator<TableSlice> = (
  set,
  get,
) => ({
  ...initialTableSliceState,
  addTable: (table, index) => {
    const state = get();
    if (state.tables.some((x) => x.id === table.id)) {
      throw new Error(`Table with ID ${table.id} already exists.`);
    }
    set((draft) => {
      draft.tables.splice(index ?? draft.tables.length, 0, table);
    });
  },
  updateTable: (tableId, updates) => {
    const state = get();
    const index = state.tables.findIndex((table) => table.id === tableId);
    if (index === -1) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    set((draft) => {
      draft.tables[index] = { ...draft.tables[index]!, ...updates };
    });
  },
  moveTable: (tableId, newIndex) => {
    const state = get();
    const oldIndex = state.tables.findIndex((table) => table.id === tableId);
    if (oldIndex === -1) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const [table] = draft.tables.splice(oldIndex, 1);
        draft.tables.splice(newIndex, 0, table!);
      });
    }
  },
  deleteTable: (tableId) => {
    const state = get();
    const index = state.tables.findIndex((table) => table.id === tableId);
    if (index === -1) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    state.unloadTable(tableId);
    set((draft) => {
      draft.tables.splice(index, 1);
    });
  },
  clearTables: () => {
    const state = get();
    while (state.tables.length > 0) {
      state.deleteTable(state.tables[0]!.id);
    }
    set(initialTableSliceState);
  },
  createTableDataLoader: (tableId) => {
    const state = get();
    const table = state.tables.find((table) => table.id === tableId);
    if (table === undefined) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    const dataLoaderFactory = state.tableDataLoaderFactories.get(
      table.dataSource.type,
    );
    if (dataLoaderFactory === undefined) {
      throw new Error(
        `No table data loader found for type ${table.dataSource.type}.`,
      );
    }
    const dataLoader = dataLoaderFactory(table.dataSource, state.workspace);
    return dataLoader;
  },
  loadTable: async (tableId, options) => {
    const { signal, reload } = options ?? {};
    signal?.throwIfAborted();
    const state = get();
    const loadedTable = state.loadedTables.get(tableId);
    if (loadedTable !== undefined && !reload) {
      return loadedTable;
    }
    const table = state.tables.find((table) => table.id === tableId);
    if (table === undefined) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    let data;
    const dataSourceCache = state.tableDataSourceCaches.find(({ dataSource }) =>
      deepEqual(dataSource, table.dataSource),
    );
    if (dataSourceCache !== undefined) {
      data = dataSourceCache.data;
    } else {
      const dataLoaderFactory = state.tableDataLoaderFactories.get(
        table.dataSource.type,
      );
      if (dataLoaderFactory === undefined) {
        throw new Error(
          `No table data loader found for type ${table.dataSource.type}.`,
        );
      }
      const dataLoader = dataLoaderFactory(table.dataSource, state.workspace);
      const newData = await dataLoader.loadTable({ signal });
      signal?.throwIfAborted();
      set((draft) => {
        draft.tableDataSourceCaches.push({
          dataSource: table.dataSource,
          data: newData,
        });
      });
      data = newData;
    }
    const newLoadedData = { data, loadedColumns: new Map() };
    set((draft) => {
      draft.loadedTables.set(tableId, newLoadedData);
    });
    return newLoadedData;
  },
  loadTableColumn: async <T>(
    tableId: string,
    column: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => {
    const { signal, reload = false } = options ?? {};
    signal?.throwIfAborted();
    const state = get();
    const loadedTable = await state.loadTable(tableId, { signal });
    signal?.throwIfAborted();
    const loadedColumn = loadedTable.loadedColumns.get(column);
    if (loadedColumn !== undefined && !reload) {
      return loadedColumn as LoadedTableColumn<T>;
    }
    const values = await loadedTable.data.loadValues<T>(column, { signal });
    signal?.throwIfAborted();
    const valueRange = await loadedTable.data.loadValueRange(column, {
      signal,
    });
    signal?.throwIfAborted();
    set((draft) => {
      const loadedTable = draft.loadedTables.get(tableId)!;
      loadedTable.loadedColumns.set(column, { values, valueRange });
    });
    return { values, valueRange };
  },
  unloadTableColumn: (tableId, column) => {
    set((draft) => {
      const loadedTable = draft.loadedTables.get(tableId);
      if (loadedTable === undefined) {
        throw new Error(`Table with ID ${tableId} not loaded.`);
      }
      loadedTable.loadedColumns.delete(column);
    });
  },
  unloadTable: (tableId) => {
    const state = get();
    const loadedTable = state.loadedTables.get(tableId);
    if (loadedTable !== undefined) {
      let clearDataSourceCache = true;
      for (const otherLoadedData of state.loadedTables.values()) {
        if (otherLoadedData.data === loadedTable.data) {
          clearDataSourceCache = false;
          break;
        }
      }
      set((draft) => {
        draft.loadedTables.delete(tableId);
        if (clearDataSourceCache) {
          draft.tableDataSourceCaches = draft.tableDataSourceCaches.filter(
            (dataSourceCache) => dataSourceCache.data !== loadedTable.data,
          );
        }
      });
    }
  },
});

const initialTableSliceState: TableSliceState = {
  tables: [],
  loadedTables: new Map(),
  tableDataSourceCaches: [],
};
