import { useCallback, useMemo } from "react";

import type { ItemsData } from "@tissuumaps/core";

import { useTableData } from "@/hooks/useData";

import type { AnnotationsTableRowData } from "./AnnotationsItemTable";

export function useItemRows(data: ItemsData | undefined, table: string | null) {
  const tableData = useTableData(table);

  // the ids and the per-index accessors the rows are built from, so that only
  // the rows within the visible range have to be materialized
  const { ids, getName, annotatedIds, allAnnotated } = useMemo(() => {
    let ids: number[] = [];
    let getName: ((index: number) => string | undefined) | undefined;
    let annotatedIds: Set<number> | undefined;
    let allAnnotated = false;
    if (data !== undefined) {
      ids = data.getIds();
      if (table !== null) {
        // the selected table governs the names; while it is still loading there
        // are none yet, rather than the object's own names, which would show a
        // different column for a moment and then be replaced
        if (tableData !== null) {
          const tableIds = tableData.getIds();
          // table-backed items hand out the table's own ids array, so every
          // item has a row in the table and no lookup structure is needed
          if (tableIds === ids) {
            allAnnotated = true;
          } else {
            annotatedIds = new Set(tableIds);
          }
          const tableNames = tableData.getNames?.();
          if (tableNames !== undefined) {
            // the shared ids array aligns the names by index; only other item
            // types need the id lookup
            if (tableIds === ids) {
              getName = (index) => tableNames[index];
            } else {
              const tableNamesById = new Map(
                tableIds.map((id, i) => [id, tableNames[i]!]),
              );
              getName = (index) => tableNamesById.get(ids[index]!);
            }
          }
        }
      } else {
        const names = data.getNames?.();
        if (names !== undefined) {
          getName = (index) => names[index];
        }
      }
    } else if (tableData !== null) {
      ids = tableData.getIds();
      const names = tableData.getNames?.();
      if (names !== undefined) {
        getName = (index) => names[index];
      }
    }
    return { ids, getName, annotatedIds, allAnnotated };
  }, [data, table, tableData]);

  const getRows = useCallback(
    (startIndex: number, endIndex: number) => {
      const rows: AnnotationsTableRowData[] = [];
      for (let index = startIndex; index < endIndex; index++) {
        const id = ids[index]!;
        rows.push({
          id,
          name: getName?.(index),
          annotated: allAnnotated ? true : annotatedIds?.has(id),
        });
      }
      return rows;
    },
    [ids, getName, annotatedIds, allAnnotated],
  );

  return { rowCount: ids.length, getRows, named: getName !== undefined };
}
