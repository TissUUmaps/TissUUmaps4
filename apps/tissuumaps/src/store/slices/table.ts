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

type LoadedTableData = {
  dataSource: TableDataSource;
  data: TableData;
  loadedValues: Map<string, MappableArrayLike<unknown>>;
  loadedValueRanges: Map<string, [number, number] | undefined>;
};

export type TableSlice = TableSliceState & TableSliceActions;

export type TableSliceState = {
  tables: Table[];
  loadedTables: Map<string, string>;
  loadedTableData: Map<string, LoadedTableData>;
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
  ) => Promise<TableData>;
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
    for (const loadedData of state.loadedTableData.values()) {
      loadedData.data.destroy();
    }
    set(createInitialTableSliceState());
  },
  loadTable: deduplicate(
    async (tableId, options) => {
      const { signal, reload = false, onProgress } = options ?? {};
      signal?.throwIfAborted();
      // Check if the table is already loaded
      const state = get();
      const loadedDataKey = state.loadedTables.get(tableId);
      if (loadedDataKey !== undefined && !reload) {
        const loadedData = state.loadedTableData.get(loadedDataKey);
        if (loadedData !== undefined) {
          return loadedData.data;
        }
      }
      // Find the table and the corresponding data source (if loaded)
      const table = state.tables.find((table) => table.id === tableId);
      if (table === undefined) {
        throw new Error(`Table with ID ${tableId} not found.`);
      }
      let oldLoadedData: LoadedTableData | undefined;
      for (const loadedData of state.loadedTableData.values()) {
        if (deepEqual(loadedData.dataSource, table.dataSource)) {
          oldLoadedData = loadedData;
          break;
        }
      }
      // Load the data source if not already loaded or if a reload has been requested
      let loadedData = oldLoadedData;
      if (loadedData === undefined || reload) {
        const { dataStorageFactory } =
          state.tableDataStorageRegistry.get(table.dataSource.type) ?? {};
        if (dataStorageFactory === undefined) {
          throw new Error(
            `No table data storage adapter registered for data source type ${table.dataSource.type}.`,
          );
        }
        const dataStorage = dataStorageFactory(
          table.dataSource,
          state.workspace,
        );
        const data = await dataStorage.loadTable({ signal, onProgress });
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
        loadedData = {
          dataSource: currentTable.dataSource,
          data,
          loadedValues: new Map(),
          loadedValueRanges: new Map(),
        };
      }
      // Store the loaded table and the corresponding data source in the state
      set((draft) => {
        let loadedDataKey;
        for (const [key, value] of draft.loadedTableData) {
          if (deepEqual(value.dataSource, loadedData.dataSource)) {
            loadedDataKey = key;
            break;
          }
        }
        if (loadedDataKey === undefined) {
          do {
            loadedDataKey = crypto.randomUUID();
          } while (draft.loadedTableData.has(loadedDataKey));
        }
        draft.loadedTables.set(tableId, loadedDataKey);
        draft.loadedTableData.set(loadedDataKey, loadedData);
      });
      // Clean up old data if the loaded data source has changed
      if (
        oldLoadedData !== undefined &&
        oldLoadedData.data !== loadedData.data
      ) {
        oldLoadedData.data.destroy();
      }
      return loadedData.data;
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
      const loadedDataKey = state.loadedTables.get(tableId);
      if (loadedDataKey === undefined) {
        throw new Error(`Table with ID ${tableId} not loaded.`);
      }
      const loadedData = state.loadedTableData.get(loadedDataKey);
      if (loadedData === undefined) {
        throw new Error(`Data source for table with ID ${tableId} not loaded.`);
      }
      const oldValues = loadedData.loadedValues.get(column);
      if (oldValues !== undefined && !reload) {
        return oldValues as MappableArrayLike<T>;
      }
      // Load the requested values
      const values = await loadedData.data.loadValues<T>(column, {
        signal,
        onProgress,
      });
      signal?.throwIfAborted();
      // Check if the table has been unloaded or its data source has changed
      const currentState = get();
      const currentLoadedDataKey = currentState.loadedTables.get(tableId);
      if (
        currentLoadedDataKey === undefined ||
        currentLoadedDataKey !== loadedDataKey
      ) {
        throw new DOMException(
          `Table with ID ${tableId} has been unloaded or its data source has changed.`,
          "AbortError",
        );
      }
      const currentLoadedData =
        currentState.loadedTableData.get(currentLoadedDataKey);
      if (
        currentLoadedData === undefined ||
        !deepEqual(currentLoadedData.dataSource, loadedData.dataSource)
      ) {
        throw new DOMException(
          `Data source for table with ID ${tableId} has been unloaded or changed.`,
          "AbortError",
        );
      }
      // Store the loaded values in the state
      set((draft) => {
        const loadedDataDraft =
          draft.loadedTableData.get(currentLoadedDataKey)!;
        loadedDataDraft.loadedValues.set(column, values);
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
      const loadedDataKey = state.loadedTables.get(tableId);
      if (loadedDataKey === undefined) {
        throw new Error(`Table with ID ${tableId} not loaded.`);
      }
      const loadedData = state.loadedTableData.get(loadedDataKey);
      if (loadedData === undefined) {
        throw new Error(`Data source for table with ID ${tableId} not loaded.`);
      }
      if (loadedData.loadedValueRanges.has(column) && !reload) {
        return loadedData.loadedValueRanges.get(column);
      }
      // Load the requested value range
      const valueRange = await loadedData.data.loadValueRange(column, {
        signal,
        onProgress,
      });
      signal?.throwIfAborted();
      // Check if the table has been unloaded or its data source has changed
      const currentState = get();
      const currentLoadedDataKey = currentState.loadedTables.get(tableId);
      if (
        currentLoadedDataKey === undefined ||
        currentLoadedDataKey !== loadedDataKey
      ) {
        throw new DOMException(
          `Table with ID ${tableId} has been unloaded or its data source has changed.`,
          "AbortError",
        );
      }
      const currentLoadedData =
        currentState.loadedTableData.get(currentLoadedDataKey);
      if (
        currentLoadedData === undefined ||
        !deepEqual(currentLoadedData.dataSource, loadedData.dataSource)
      ) {
        throw new DOMException(
          `Data source for table with ID ${tableId} has been unloaded or changed.`,
          "AbortError",
        );
      }
      // Store the loaded value range in the state
      set((draft) => {
        const loadedDataDraft =
          draft.loadedTableData.get(currentLoadedDataKey)!;
        loadedDataDraft.loadedValueRanges.set(column, valueRange);
      });
      return valueRange;
    },
    (_tableId, _column, options) => options?.signal,
  ),
  unloadTable: (tableId) => {
    const state = get();
    const loadedDataKey = state.loadedTables.get(tableId);
    if (loadedDataKey === undefined) {
      return false;
    }
    const loadedData = state.loadedTableData.get(loadedDataKey);
    if (loadedData === undefined) {
      throw new Error(`Data source for table with ID ${tableId} not loaded.`);
    }
    let destroy = true;
    for (const [otherTableId, otherLoadedDataKey] of state.loadedTables) {
      if (otherTableId !== tableId && otherLoadedDataKey === loadedDataKey) {
        destroy = false;
        break;
      }
    }
    set((draft) => {
      draft.loadedTables.delete(tableId);
      if (destroy) {
        draft.loadedTableData.delete(loadedDataKey);
      }
    });
    if (destroy) {
      loadedData.data.destroy();
    }
    return true;
  },
});

function createInitialTableSliceState(): TableSliceState {
  return {
    tables: [],
    loadedTables: new Map(),
    loadedTableData: new Map(),
  };
}
