import { useCallback, useEffect, useMemo, useState } from "react";

import type { GenericArray, TableData } from "@tissuumaps/core";

import { useTableData } from "@/hooks/useData";

import type { AnnotationsGroupTableRowData } from "./AnnotationsGroupTable";

type LoadedGroups = {
  tableData: TableData;
  groupByColumn: string;
  groups: GenericArray<string>;
};

export function useGroupRows(table: string, groupByColumn: string) {
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

  // the groups are sorted as the plain values they are loaded as; a row object
  // per group would cost as much as one per item for a column of unique values
  const sortedGroups = useMemo(() => {
    if (groups === null) {
      return null;
    }
    const sortedGroups = Array.from(groups, String);
    sortedGroups.sort((a, b) => a.localeCompare(b));
    return sortedGroups;
  }, [groups]);

  const getRows = useCallback(
    (startIndex: number, endIndex: number): AnnotationsGroupTableRowData[] =>
      sortedGroups?.slice(startIndex, endIndex).map((group) => ({ group })) ??
      [],
    [sortedGroups],
  );

  return {
    rowCount: sortedGroups?.length ?? 0,
    getRows,
    loaded: sortedGroups !== null,
  };
}
