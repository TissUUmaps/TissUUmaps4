import { useCallback } from "react";

import { useTissUUmaps } from "../store";

export function useTableColumnSelector(tableId: string | null) {
  const loadTable = useTissUUmaps((state) => state.loadTable);
  const loadedTableDataSources = useTissUUmaps(
    (state) => state.loadedTableDataSources,
  );

  const suggestTableColumnQueries = useCallback(
    async (currentQuery: string, options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      if (tableId !== null) {
        const loadedTable = await loadTable(tableId, { signal });
        signal?.throwIfAborted();
        const loadedTableDataSource = loadedTableDataSources.get(
          loadedTable.loadedDataSourceKey,
        );
        if (loadedTableDataSource !== undefined) {
          return await loadedTableDataSource.data.suggestColumnQueries(
            currentQuery,
            { signal },
          );
        }
      }
      return [];
    },
    [tableId, loadTable, loadedTableDataSources],
  );

  const resolveTableColumnQuery = useCallback(
    async (query: string, options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      if (tableId !== null) {
        const loadedTable = await loadTable(tableId, { signal });
        signal?.throwIfAborted();
        const loadedTableDataSource = loadedTableDataSources.get(
          loadedTable.loadedDataSourceKey,
        );
        if (loadedTableDataSource !== undefined) {
          return await loadedTableDataSource.data.resolveColumnQuery(query, {
            signal,
          });
        }
      }
      return null;
    },
    [tableId, loadTable, loadedTableDataSources],
  );

  return { suggestTableColumnQueries, resolveTableColumnQuery };
}
