import { useCallback } from "react";

import { useProjectStore } from "@/stores/project";

import { useTableDataLoader } from "./useDataLoader";

/**
 * Provides the column query callbacks for selecting a column of a table
 *
 * Both callbacks load the table's data on demand, and yield no suggestions
 * respectively no column if `tableId` does not identify a table of the current
 * project.
 *
 * @param tableId - The ID of the table whose columns are to be selected
 * @returns Callbacks for suggesting and for resolving column queries
 */
export function useTableColumnSelector(tableId: string | null) {
  const table = useProjectStore(
    (state) => state.tables.find((table) => table.id === tableId) ?? null,
  );

  const loadTable = useTableDataLoader();

  const suggestTableColumnQueries = useCallback(
    async (currentQuery: string, options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      if (table !== null) {
        const tableData = await loadTable(table, { signal });
        return tableData.suggestColumnQueries(currentQuery, { signal });
      }
      return [];
    },
    [table, loadTable],
  );

  const resolveTableColumnQuery = useCallback(
    async (query: string, options?: { signal?: AbortSignal }) => {
      const { signal } = options ?? {};
      signal?.throwIfAborted();
      if (table !== null) {
        const tableData = await loadTable(table, { signal });
        return tableData.resolveColumnQuery(query, { signal });
      }
      return null;
    },
    [table, loadTable],
  );

  return { suggestTableColumnQueries, resolveTableColumnQuery };
}
