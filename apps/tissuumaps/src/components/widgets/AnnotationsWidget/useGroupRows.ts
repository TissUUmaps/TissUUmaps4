import { useEffect, useMemo, useState } from "react";

import type { GenericArray, TableData } from "@tissuumaps/core";

import { useTableData } from "@/hooks/useData";

import type { AnnotationsTableGroupRowData } from "./AnnotationsGroupTable";

type LoadedGroups = {
  tableData: TableData;
  groupByColumn: string;
  groups: GenericArray<string>;
};

export function useGroupRows(
  table: string,
  groupByColumn: string,
): AnnotationsTableGroupRowData[] | null {
  // the groups are kept with what they were loaded from, so that the ones of
  // a previous table or column are not shown as the current ones
  const [loadedGroups, setLoadedGroups] = useState<LoadedGroups | null>(null);

  const tableData = useTableData(table);

  const groups =
    loadedGroups?.tableData === tableData &&
    loadedGroups.groupByColumn === groupByColumn
      ? loadedGroups.groups
      : null;

  useEffect(() => {
    const abortController = new AbortController();
    if (tableData !== null) {
      tableData
        .loadUniqueValues<string>(groupByColumn, {
          signal: abortController.signal,
        })
        .then((groups) => {
          if (!abortController.signal.aborted) {
            setLoadedGroups({ tableData, groupByColumn, groups });
          }
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error loading unique table values", error);
          }
        });
    }
    return () => {
      abortController.abort();
    };
  }, [tableData, groupByColumn]);

  return useMemo(() => {
    if (groups === null) {
      return null;
    }
    const groupRows = groups.map((group) => ({ group: String(group) }));
    groupRows.sort((a, b) => a.group.localeCompare(b.group));
    return groupRows;
  }, [groups]);
}
