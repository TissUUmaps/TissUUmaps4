import { deepEqual } from "fast-equals";

import {
  type Table,
  type TableData,
  type TableDataSource,
} from "@tissuumaps/core";

import { type TissUUmapsStateCreator } from "./index";

export type TableSlice = TableSliceState & TableSliceActions;

export type TableSliceState = {
  tables: Table[];
  _tableDataCache: { dataSource: TableDataSource; data: TableData }[];
};

export type TableSliceActions = {
  addTable: (table: Table, index?: number) => void;
  setTable: (tableId: string, table: Table) => void;
  moveTable: (tableId: string, newIndex: number) => void;
  loadTable: (
    tableId: string,
    options: { signal?: AbortSignal },
  ) => Promise<TableData>;
  unloadTable: (tableId: string) => void;
  deleteTable: (tableId: string) => void;
  clearTables: () => void;
};

export const createTableSlice: TissUUmapsStateCreator<TableSlice> = (
  set,
  get,
) => ({
  ...initialTableSliceState,
  addTable: (table, index) => {
    const state = get();
    if (state.tables.find((x) => x.id === table.id) !== undefined) {
      throw new Error(`Table with ID ${table.id} already exists.`);
    }
    set((draft) => {
      draft.tables.splice(index ?? draft.tables.length, 0, table);
    });
  },
  setTable: (tableId, table) => {
    const state = get();
    const index = state.tables.findIndex((x) => x.id === tableId);
    if (index === -1) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    set((draft) => {
      draft.tables[index] = table;
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
  loadTable: async (tableId, { signal }: { signal?: AbortSignal } = {}) => {
    signal?.throwIfAborted();
    const state = get();
    const table = state.tables.find((table) => table.id === tableId);
    if (table === undefined) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    const cache = state._tableDataCache.find(({ dataSource }) =>
      deepEqual(dataSource, table.dataSource),
    );
    if (cache !== undefined) {
      return cache.data;
    }
    const dataLoaderFactory = state.tableDataLoaderFactories.get(
      table.dataSource.type,
    );
    if (dataLoaderFactory === undefined) {
      throw new Error(
        `No table data loader found for type ${table.dataSource.type}.`,
      );
    }
    const dataLoader = dataLoaderFactory(table.dataSource, state.projectDir);
    const data = await dataLoader.loadTable({ signal });
    signal?.throwIfAborted();
    set((draft) => {
      draft._tableDataCache.push({ dataSource: table.dataSource, data });
    });
    return data;
  },
  unloadTable: (tableId) => {
    const state = get();
    const table = state.tables.find((table) => table.id === tableId);
    if (table === undefined) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    const cacheIndex = state._tableDataCache.findIndex(({ dataSource }) =>
      deepEqual(dataSource, table.dataSource),
    );
    if (cacheIndex !== -1) {
      const cache = state._tableDataCache[cacheIndex]!;
      set((draft) => {
        draft._tableDataCache.splice(cacheIndex, 1);
      });
      cache.data.destroy();
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
});

const initialTableSliceState: TableSliceState = {
  tables: [],
  _tableDataCache: [],
};
