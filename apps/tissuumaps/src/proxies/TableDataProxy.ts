import { useCallback } from "react";

import { type MappableArrayLike, type TableData } from "@tissuumaps/core";
import { type ViewerAdapter } from "@tissuumaps/viewer";

import { useTissUUmaps } from "../store";
import { type LoadedTable, type LoadedTableColumn } from "../store/table";

export class TableDataProxy implements TableData {
  private readonly _loadedTable: LoadedTable;
  private readonly _loadTableColumn: <T>(
    column: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedTableColumn<T>>;

  constructor(
    loadedTable: LoadedTable,
    loadTableColumn: <T>(
      column: string,
      options?: { signal?: AbortSignal; reload?: boolean },
    ) => Promise<LoadedTableColumn<T>>,
  ) {
    this._loadedTable = loadedTable;
    this._loadTableColumn = loadTableColumn;
  }

  getIds(): number[] {
    return this._loadedTable.data.getIds();
  }

  getSize(): number {
    return this._loadedTable.data.getSize();
  }

  async suggestColumnQueries(
    currentQuery: string,
    options?: { signal?: AbortSignal },
  ): Promise<string[]> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._loadedTable.data.suggestColumnQueries(currentQuery, {
      signal,
    });
  }

  async resolveColumnQuery(
    query: string,
    options?: { signal?: AbortSignal },
  ): Promise<string | null> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    return await this._loadedTable.data.resolveColumnQuery(query, { signal });
  }

  async loadValues<T>(
    column: string,
    options?: { signal?: AbortSignal },
  ): Promise<MappableArrayLike<T>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const loadedTableColumn = await this._loadTableColumn<T>(column, {
      signal,
    });
    signal?.throwIfAborted();
    return loadedTableColumn.values;
  }

  async loadValueRange(
    column: string,
    options?: { signal?: AbortSignal },
  ): Promise<[number, number] | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const loadedTableColumn = await this._loadTableColumn(column, { signal });
    signal?.throwIfAborted();
    return loadedTableColumn.valueRange;
  }

  destroy(): void {
    this._loadedTable.data.destroy();
  }
}

export async function loadTableDataProxy(
  tableId: string,
  loadTable: (
    tableId: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedTable>,
  loadTableColumn: <T>(
    tableId: string,
    column: string,
    options?: { signal?: AbortSignal; reload?: boolean },
  ) => Promise<LoadedTableColumn<T>>,
  options?: { signal?: AbortSignal },
) {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const loadedTable = await loadTable(tableId, { signal });
  signal?.throwIfAborted();
  return new TableDataProxy(loadedTable, (column, options) =>
    loadTableColumn(tableId, column, options),
  );
}

export function useTableDataProxy(): ViewerAdapter["loadTable"] {
  const loadTable = useTissUUmaps((state) => state.loadTable);
  const loadTableColumn = useTissUUmaps((state) => state.loadTableColumn);
  return useCallback(
    (tableId, options) =>
      loadTableDataProxy(tableId, loadTable, loadTableColumn, options),
    [loadTable, loadTableColumn],
  );
}
