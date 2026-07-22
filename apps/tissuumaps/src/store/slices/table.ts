import { deepEqual } from "fast-equals";

import type {
  GenericArray,
  ProgressCallback,
  Table,
  TableData,
  TableDataSource,
} from "@tissuumaps/core";

import { deduplicate } from "../deduplicate";
import type { TissUUmapsStateCreator } from "../index";

type LoadedTableData = {
  dataSource: TableDataSource;
  data: TableData;
  loadedValues: Map<string, GenericArray<unknown>>;
  loadedUniqueValues: Map<string, GenericArray<unknown>>;
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
      newDataSource?: TableDataSource;
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
  ) => Promise<GenericArray<T>>;
  loadUniqueTableValues: <T>(
    tableId: string,
    column: string,
    options?: {
      signal?: AbortSignal;
      reload?: boolean;
      onProgress?: ProgressCallback;
    },
  ) => Promise<GenericArray<T>>;
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
      loadedData.data.close();
    }
    set(createInitialTableSliceState());
  },
  loadTable: deduplicate(
    async (tableId, options) => {
      const {
        signal,
        reload = false,
        onProgress,
        newDataSource,
      } = options ?? {};
      signal?.throwIfAborted();

      const state = get();
      const table = state.tables.find((table) => table.id === tableId);
      if (table === undefined) {
        throw new Error(`Table with ID ${tableId} not found.`);
      }
      const dataSource = newDataSource ?? table.dataSource;

      let oldLoadedData;
      const oldLoadedDataKey = state.loadedTables.get(tableId);
      if (oldLoadedDataKey !== undefined) {
        oldLoadedData = state.loadedTableData.get(oldLoadedDataKey);
        if (
          !reload &&
          newDataSource === undefined &&
          oldLoadedData !== undefined
        ) {
          return oldLoadedData.data;
        }
      }

      let existingLoadedData = oldLoadedData;
      if (existingLoadedData === undefined) {
        for (const [key, value] of state.loadedTableData) {
          if (deepEqual(value.dataSource, dataSource)) {
            existingLoadedData = value;
            if (!reload) {
              set((draft) => {
                draft.loadedTables.set(tableId, key);
                if (newDataSource !== undefined) {
                  const tableDraft = draft.tables.find(
                    (table) => table.id === tableId,
                  )!;
                  tableDraft.dataSource = newDataSource;
                }
              });
              return existingLoadedData.data;
            }
            break;
          }
        }
      }

      let data = existingLoadedData?.data;
      if (reload || newDataSource !== undefined || data === undefined) {
        const dataProvider = state.tableDataProviders.get(dataSource.type);
        if (dataProvider === undefined) {
          throw new Error(
            `No table data provider registered for data source type ${dataSource.type}.`,
          );
        }
        data = await dataProvider.open(dataSource, {
          signal,
          onProgress,
          workspace: state.workspace,
        });
        if (signal?.aborted) {
          data.close();
          signal.throwIfAborted();
        }
        const currentState = get();
        const currentTable = currentState.tables.find(
          (table) => table.id === tableId,
        );
        if (
          currentTable === undefined ||
          !deepEqual(currentTable.dataSource, table.dataSource)
        ) {
          data.close();
          throw new DOMException(
            `Table with ID ${tableId} has been deleted or its data source has changed.`,
            "AbortError",
          );
        }
      }

      set((draft) => {
        let loadedDataKey;
        for (const [key, value] of draft.loadedTableData) {
          if (deepEqual(value.dataSource, dataSource)) {
            loadedDataKey = key;
            break;
          }
        }
        if (loadedDataKey === undefined) {
          do {
            loadedDataKey = crypto.randomUUID();
          } while (draft.loadedTableData.has(loadedDataKey));
        }
        draft.loadedTableData.set(loadedDataKey, {
          dataSource,
          data,
          loadedValues: new Map(),
          loadedUniqueValues: new Map(),
          loadedValueRanges: new Map(),
        });
        draft.loadedTables.set(tableId, loadedDataKey);
        if (newDataSource !== undefined) {
          const tableDraft = draft.tables.find(
            (table) => table.id === tableId,
          )!;
          tableDraft.dataSource = newDataSource;
        }
      });

      if (
        existingLoadedData !== undefined &&
        existingLoadedData.data !== data
      ) {
        existingLoadedData.data.close();
      }

      return data;
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
        return oldValues as GenericArray<T>;
      }
      // Load the requested values
      const values = await loadedData.data.loadValues<T>(column, {
        signal,
        onProgress,
      });
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
  loadUniqueTableValues: deduplicate(
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
      // Check if the table, the corresponding data source, and the requested unique values are already loaded
      const state = get();
      const loadedDataKey = state.loadedTables.get(tableId);
      if (loadedDataKey === undefined) {
        throw new Error(`Table with ID ${tableId} not loaded.`);
      }
      const loadedData = state.loadedTableData.get(loadedDataKey);
      if (loadedData === undefined) {
        throw new Error(`Data source for table with ID ${tableId} not loaded.`);
      }
      const oldUniqueValues = loadedData.loadedUniqueValues.get(column);
      if (oldUniqueValues !== undefined && !reload) {
        return oldUniqueValues as GenericArray<T>;
      }
      // Load the requested unique values
      const uniqueValues = await loadedData.data.loadUniqueValues<T>(column, {
        signal,
        onProgress,
      });
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
      // Store the loaded unique values in the state
      set((draft) => {
        const loadedDataDraft =
          draft.loadedTableData.get(currentLoadedDataKey)!;
        loadedDataDraft.loadedUniqueValues.set(column, uniqueValues);
      });
      return uniqueValues;
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
      // use has() to allow caching undefined value ranges!
      if (loadedData.loadedValueRanges.has(column) && !reload) {
        return loadedData.loadedValueRanges.get(column);
      }
      // Load the requested value range
      const valueRange = await loadedData.data.loadValueRange(column, {
        signal,
        onProgress,
      });
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
      loadedData.data.close();
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
