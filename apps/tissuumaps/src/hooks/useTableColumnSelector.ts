import { useCallback } from "react";

import { useTissUUmaps } from "../store";

export function useTableColumnSelector(tableId: string | null) {
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const suggestTableColumnQueries = useCallback(
    async (currentQuery: string, options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      if (tableId !== null) {
        const loadedTable = await loadTable(tableId, { signal });
        signal?.throwIfAborted();
        const loadedTableDataSource = useTissUUmaps
          .getState()
          .loadedTableDataSources.get(loadedTable.loadedDataSourceKey);
        if (loadedTableDataSource !== undefined) {
          return await loadedTableDataSource.data.suggestColumnQueries(
            currentQuery,
            { signal },
          );
        }
      }
      return [];
    },
    [tableId, loadTable],
  );

  const resolveTableColumnQuery = useCallback(
    async (query: string, options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      if (tableId !== null) {
        const loadedTable = await loadTable(tableId, { signal });
        signal?.throwIfAborted();
        const loadedTableDataSource = useTissUUmaps
          .getState()
          .loadedTableDataSources.get(loadedTable.loadedDataSourceKey);
        if (loadedTableDataSource !== undefined) {
          return await loadedTableDataSource.data.resolveColumnQuery(query, {
            signal,
          });
        }
      }
      return null;
    },
    [tableId, loadTable],
  );

  return { suggestTableColumnQueries, resolveTableColumnQuery };
}
