import { useCallback } from "react";

import {
  type MappableArrayLike,
  type ProgressCallback,
  type TableData,
} from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "..";

export class LoadedTableDataAdapter implements TableData {
  private readonly _tableId: string;

  constructor(tableId: string) {
    this._tableId = tableId;
  }

  get loadedTable() {
    const state = useTissUUmaps.getState();
    const loadedTable = state.loadedTables.get(this._tableId);
    if (loadedTable === undefined) {
      throw new Error(`Table with ID ${this._tableId} is not loaded.`);
    }
    return loadedTable;
  }

  get loadedTableDataSource() {
    const state = useTissUUmaps.getState();
    const loadedTableDataSource = state.loadedTableDataSources.get(
      this.loadedTable.loadedDataSourceKey,
    );
    if (loadedTableDataSource === undefined) {
      throw new Error(
        `Data source with key ${this.loadedTable.loadedDataSourceKey} for table with ID ${this._tableId} is not loaded.`,
      );
    }
    return loadedTableDataSource;
  }

  getIds(): number[] {
    return this.loadedTableDataSource.data.getIds();
  }

  getSize(): number {
    return this.loadedTableDataSource.data.getSize();
  }

  async suggestColumnQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this.loadedTableDataSource.data.suggestColumnQueries(
      currentQuery,
      options,
    );
  }

  async resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this.loadedTableDataSource.data.resolveColumnQuery(
      query,
      options,
    );
  }

  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<MappableArrayLike<T>> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const state = useTissUUmaps.getState();
    return await state.loadTableValues<T>(this._tableId, column, {
      signal,
      onProgress,
    });
  }

  async loadValueRange(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<[number, number] | undefined> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const state = useTissUUmaps.getState();
    return await state.loadTableValueRange(this._tableId, column, {
      signal,
      onProgress,
    });
  }

  destroy(): void {
    // ignored intentionally
  }
}

export function useLoadedTableDataAdapter(): ViewerAdapter["loadTable"] {
  const loadTable = useTissUUmaps((state) => state.loadTable);
  return useCallback(
    async (tableId, options) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      await loadTable(tableId, { signal });
      signal?.throwIfAborted();
      return new LoadedTableDataAdapter(tableId);
    },
    [loadTable],
  );
}
