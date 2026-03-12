import { useCallback } from "react";

import { useTissUUmaps } from "../store";

export function useTableColumnSelector(tableId: string | null) {
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const suggestTableColumnQueries = useCallback(
    async (currentQuery: string) => {
      if (tableId !== null) {
        const loadedTable = await loadTable(tableId);
        return await loadedTable.data.suggestColumnQueries(currentQuery);
      }
      return [];
    },
    [tableId, loadTable],
  );

  const resolveTableColumnQuery = useCallback(
    async (query: string) => {
      if (tableId !== null) {
        const loadedTable = await loadTable(tableId);
        return await loadedTable.data.resolveColumnQuery(query);
      }
      return null;
    },
    [tableId, loadTable],
  );

  return { suggestTableColumnQueries, resolveTableColumnQuery };
}
