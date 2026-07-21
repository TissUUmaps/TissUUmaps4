import { useCallback } from "react";

import type {
  GenericArray,
  ProgressCallback,
  TableData,
} from "@tissuumaps/core";
import type { ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "..";

export class LoadedTableDataAdapter implements TableData {
  private readonly _tableId: string;

  constructor(tableId: string) {
    this._tableId = tableId;
  }

  getIds(): number[] {
    return this._getData().getIds();
  }

  getSize(): number {
    return this._getData().getSize();
  }

  getNames(): string[] | undefined {
    return this._getData().getNames();
  }

  async suggestColumnQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._getData().suggestColumnQueries(currentQuery, options);
  }

  async resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._getData().resolveColumnQuery(query, options);
  }

  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const state = useTissUUmaps.getState();
    return await state.loadTableValues<T>(this._tableId, column, {
      signal,
      onProgress,
    });
  }

  async loadUniqueValues<T>(
    column: string,
    options?: { signal?: AbortSignal; onProgress?: ProgressCallback },
  ): Promise<GenericArray<T>> {
    const { signal, onProgress } = options ?? {};
    signal?.throwIfAborted();
    const state = useTissUUmaps.getState();
    return await state.loadUniqueTableValues<T>(this._tableId, column, {
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

  close(): void {
    // ignored intentionally
  }

  private _getData() {
    const state = useTissUUmaps.getState();
    const loadedDataKey = state.loadedTables.get(this._tableId);
    if (loadedDataKey !== undefined) {
      const loadedData = state.loadedTableData.get(loadedDataKey);
      if (loadedData !== undefined) {
        return loadedData.data;
      }
    }
    throw new Error(`Data source not loaded for table ID ${this._tableId}`);
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
