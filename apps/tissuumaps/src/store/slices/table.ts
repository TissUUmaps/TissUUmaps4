import { deepEqual } from "fast-equals";

import {
  type MappableArrayLike,
  type ProgressCallback,
  type Table,
  type TableData,
  type TableDataSource,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import { type TissUUmapsStateCreator } from "../index";

type LoadedTable = {
  loadedDataSourceKey: string;
};

type LoadedTableDataSource = {
  dataSource: TableDataSource;
  data: TableData;
  loadedValues: Map<string, MappableArrayLike<unknown>>;
  loadedValueRanges: Map<string, [number, number] | undefined>;
};

export type TableSlice = TableSliceState & TableSliceActions;

export type TableSliceState = {
  tables: Table[];
  loadedTables: Map<string, LoadedTable>;
  loadedTableDataSources: Map<string, LoadedTableDataSource>;
};

export type TableSliceActions = {
  addTable: (table: Table, index?: number) => void;
  updateTable: (tableId: string, updates: Partial<Table>) => void;
  moveTable: (tableId: string, newIndex: number) => void;
  deleteTable: (tableId: string) => boolean;
  clearTables: () => void;
  loadTable: (
    tableId: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<LoadedTable>;
  loadTableValues: <T>(
    tableId: string,
    column: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<MappableArrayLike<T>>;
  loadTableValueRange: (
    tableId: string,
    column: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<[number, number] | undefined>;
  unloadTable: (tableId: string) => boolean;
};

export const createTableSlice: TissUUmapsStateCreator<TableSlice> = (
  set,
  get,
) => ({
  ...createInitialTableSliceState(),
  addTable: (table, index) => {
    const state = get();
    if (state.tables.some((x) => x.id === table.id)) {
      throw new Error(`Table with ID ${table.id} already exists.`);
    }
    if (index !== undefined && (index < 0 || index > state.tables.length)) {
      throw new Error(`Index ${index} out of bounds.`);
    }
    set((draft) => {
      draft.tables.splice(index ?? draft.tables.length, 0, table);
    });
  },
  updateTable: (tableId, updates) => {
    if (updates.id !== undefined || updates.dataSource !== undefined) {
      throw new Error("Updating table ID or data source is not allowed.");
    }
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
    if (newIndex < 0 || newIndex >= state.tables.length) {
      throw new Error(`Index ${newIndex} out of bounds.`);
    }
    const oldIndex = state.tables.findIndex((table) => table.id === tableId);
    if (oldIndex === -1) {
      throw new Error(`Table with ID ${tableId} not found.`);
    }
    if (oldIndex !== newIndex) {
      set((draft) => {
        const tableDraft = draft.tables.splice(oldIndex, 1)[0]!;
        draft.tables.splice(newIndex, 0, tableDraft);
      });
    }
  },
  deleteTable: (tableId) => {
    const state = get();
    const index = state.tables.findIndex((table) => table.id === tableId);
    if (index !== -1) {
      if (state.loadedTables.has(tableId)) {
        state.unloadTable(tableId);
      }
      set((draft) => {
        draft.tables.splice(index, 1);
      });
      return true;
    }
    return false;
  },
  clearTables: () => {
    const state = get();
    for (const loadedDataSource of state.loadedTableDataSources.values()) {
      loadedDataSource.data.destroy();
    }
    set(createInitialTableSliceState());
  },
  loadTable: deduplicate(
    async (tableId, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the table is already loaded
      const state = get();
      const loadedTable = state.loadedTables.get(tableId);
      if (loadedTable !== undefined && !reload) {
        return loadedTable;
      }
      // Find the table and the corresponding data source (if loaded)
      const table = state.tables.find((table) => table.id === tableId);
      if (table === undefined) {
        throw new Error(`Table with ID ${tableId} not found.`);
      }
      let oldLoadedDataSource: LoadedTableDataSource | undefined;
      for (const loadedDataSource of state.loadedTableDataSources.values()) {
        if (deepEqual(loadedDataSource.dataSource, table.dataSource)) {
          oldLoadedDataSource = loadedDataSource;
          break;
        }
      }
      // Load the data source if not already loaded or if a reload has been requested
      let loadedDataSource = oldLoadedDataSource;
      if (loadedDataSource === undefined || reload) {
        const { dataLoaderFactory } =
          state.tableDataLoaderRegistry.get(table.dataSource.type) ?? {};
        if (dataLoaderFactory === undefined) {
          throw new Error(
            `No table data loader registered for data source type ${table.dataSource.type}.`,
          );
        }
        const dataLoader = dataLoaderFactory(table.dataSource, state.workspace);
        const data = await dataLoader.loadTable({ signal, onProgress });
        signal?.throwIfAborted();
        // Check if the table has been deleted or its data source has changed
        const currentState = get();
        const currentTable = currentState.tables.find(
          (table) => table.id === tableId,
        );
        if (
          currentTable === undefined ||
          !deepEqual(currentTable.dataSource, table.dataSource)
        ) {
          data.destroy();
          throw new DOMException(
            `Table with ID ${tableId} has been deleted or its data source has changed.`,
            "AbortError",
          );
        }
        loadedDataSource = {
          dataSource: currentTable.dataSource,
          data,
          loadedValues: new Map(),
          loadedValueRanges: new Map(),
        };
      }
      // Store the loaded table and the corresponding data source in the state
      let newLoadedTable: LoadedTable;
      set((draft) => {
        let loadedDataSourceKey;
        for (const [key, value] of draft.loadedTableDataSources) {
          if (deepEqual(value.dataSource, loadedDataSource.dataSource)) {
            loadedDataSourceKey = key;
            break;
          }
        }
        if (loadedDataSourceKey === undefined) {
          do {
            loadedDataSourceKey = crypto.randomUUID();
          } while (draft.loadedTableDataSources.has(loadedDataSourceKey));
        }
        newLoadedTable = { loadedDataSourceKey };
        draft.loadedTables.set(tableId, newLoadedTable);
        draft.loadedTableDataSources.set(loadedDataSourceKey, loadedDataSource);
      });
      // Clean up old data if the loaded data source has changed
      if (
        oldLoadedDataSource !== undefined &&
        oldLoadedDataSource.data !== loadedDataSource.data
      ) {
        oldLoadedDataSource.data.destroy();
      }
      return newLoadedTable!;
    },
    (_tableId, options) => options?.signal,
  ),
  loadTableValues: deduplicate(
    async <T>(
      tableId: string,
      column: string,
      options?: {
        signal?: AbortSignal;
        reload?: boolean;
        onProgress?: ProgressCallback;
      },
    ) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the table, the corresponding data source, and the requested values are already loaded
      const state = get();
      const loadedTable = state.loadedTables.get(tableId);
      if (loadedTable === undefined) {
        throw new Error(`Table with ID ${tableId} not loaded.`);
      }
      const loadedDataSource = state.loadedTableDataSources.get(
        loadedTable.loadedDataSourceKey,
      );
      if (loadedDataSource === undefined) {
        throw new Error(`Data source for table with ID ${tableId} not loaded.`);
      }
      const oldValues = loadedDataSource.loadedValues.get(column);
      if (oldValues !== undefined && !reload) {
        return oldValues as MappableArrayLike<T>;
      }
      // Load the requested values
      const values = await loadedDataSource.data.loadValues<T>(column, {
        signal,
        onProgress,
      });
      signal?.throwIfAborted();
      // Check if the table has been unloaded or its data source has changed
      const currentState = get();
      const currentLoadedTable = currentState.loadedTables.get(tableId);
      if (
        currentLoadedTable === undefined ||
        currentLoadedTable.loadedDataSourceKey !==
          loadedTable.loadedDataSourceKey
      ) {
        throw new DOMException(
          `Table with ID ${tableId} has been unloaded or its data source has changed.`,
          "AbortError",
        );
      }
      const currentLoadedDataSource = currentState.loadedTableDataSources.get(
        currentLoadedTable.loadedDataSourceKey,
      );
      if (
        currentLoadedDataSource === undefined ||
        !deepEqual(
          currentLoadedDataSource.dataSource,
          loadedDataSource.dataSource,
        )
      ) {
        throw new DOMException(
          `Data source for table with ID ${tableId} has been unloaded or changed.`,
          "AbortError",
        );
      }
      // Store the loaded values in the state
      set((draft) => {
        const loadedTableDraft = draft.loadedTables.get(tableId)!;
        const loadedDataSourceDraft = draft.loadedTableDataSources.get(
          loadedTableDraft.loadedDataSourceKey,
        )!;
        loadedDataSourceDraft.loadedValues.set(column, values);
      });
      return values;
    },
    (_tableId, _column, options) => options?.signal,
  ),
  loadTableValueRange: deduplicate(
    async (tableId, column, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the table, the corresponding data source, and the requested value range are already loaded
      const state = get();
      const loadedTable = state.loadedTables.get(tableId);
      if (loadedTable === undefined) {
        throw new Error(`Table with ID ${tableId} not loaded.`);
      }
      const loadedDataSource = state.loadedTableDataSources.get(
        loadedTable.loadedDataSourceKey,
      );
      if (loadedDataSource === undefined) {
        throw new Error(`Data source for table with ID ${tableId} not loaded.`);
      }
      if (loadedDataSource.loadedValueRanges.has(column) && !reload) {
        return loadedDataSource.loadedValueRanges.get(column);
      }
      // Load the requested value range
      const valueRange = await loadedDataSource.data.loadValueRange(column, {
        signal,
        onProgress,
      });
      signal?.throwIfAborted();
      // Check if the table has been unloaded or its data source has changed
      const currentState = get();
      const currentLoadedTable = currentState.loadedTables.get(tableId);
      if (
        currentLoadedTable === undefined ||
        currentLoadedTable.loadedDataSourceKey !==
          loadedTable.loadedDataSourceKey
      ) {
        throw new DOMException(
          `Table with ID ${tableId} has been unloaded or its data source has changed.`,
          "AbortError",
        );
      }
      const currentLoadedDataSource = currentState.loadedTableDataSources.get(
        currentLoadedTable.loadedDataSourceKey,
      );
      if (
        currentLoadedDataSource === undefined ||
        !deepEqual(
          currentLoadedDataSource.dataSource,
          loadedDataSource.dataSource,
        )
      ) {
        throw new DOMException(
          `Data source for table with ID ${tableId} has been unloaded or changed.`,
          "AbortError",
        );
      }
      // Store the loaded value range in the state
      set((draft) => {
        const loadedTableDraft = draft.loadedTables.get(tableId)!;
        const loadedDataSourceDraft = draft.loadedTableDataSources.get(
          loadedTableDraft.loadedDataSourceKey,
        )!;
        loadedDataSourceDraft.loadedValueRanges.set(column, valueRange);
      });
      return valueRange;
    },
    (_tableId, _column, options) => options?.signal,
  ),
  unloadTable: (tableId) => {
    const state = get();
    const loadedTable = state.loadedTables.get(tableId);
    if (loadedTable === undefined) {
      return false;
    }
    const loadedDataSource = state.loadedTableDataSources.get(
      loadedTable.loadedDataSourceKey,
    );
    if (loadedDataSource === undefined) {
      throw new Error(`Data source for table with ID ${tableId} not loaded.`);
    }
    let destroy = true;
    for (const [otherTableId, otherLoadedTable] of state.loadedTables) {
      if (
        otherTableId !== tableId &&
        otherLoadedTable.loadedDataSourceKey === loadedTable.loadedDataSourceKey
      ) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedTables.delete(tableId);
      if (destroy) {
        draft.loadedTableDataSources.delete(loadedTable.loadedDataSourceKey);
      }
    });
    if (destroy) {
      loadedDataSource.data.destroy();
    }
    return true;
  },
});

function createInitialTableSliceState(): TableSliceState {
  return {
    tables: [],
    loadedTables: new Map(),
    loadedTableDataSources: new Map(),
  };
}
