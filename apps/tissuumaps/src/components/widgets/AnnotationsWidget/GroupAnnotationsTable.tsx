import { useCallback, useEffect, useMemo, useState } from "react";

import type { GenericArray, TableData } from "@tissuumaps/core";

import {
  VirtualTable,
  type VirtualTableColumnDef,
} from "@/components/common/virtual-table";
import { useTableData } from "@/hooks/useData";

export type GroupAnnotationsTableRowData = {
  group: string;
};

export type GroupAnnotationsTableColumnDef =
  VirtualTableColumnDef<GroupAnnotationsTableRowData>;

export type GroupAnnotationsTableProps = {
  height: number;
  rowHeight: number;
  table: string;
  groupByColumn: string;
  extraGroupColumnDefs?: GroupAnnotationsTableColumnDef[];
};

type LoadedGroups = {
  tableData: TableData;
  groupByColumn: string;
  groups: GenericArray<string>;
};

export function GroupAnnotationsTable({
  height,
  rowHeight,
  table,
  groupByColumn,
  extraGroupColumnDefs,
}: GroupAnnotationsTableProps) {
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
        .loadUniqueValueCounts<string>(groupByColumn, {
          signal: abortController.signal,
        })
        .then((uniqueValueCounts) => {
          if (!abortController.signal.aborted) {
            setLoadedGroups({
              tableData,
              groupByColumn,
              groups: Array.from(uniqueValueCounts.keys()),
            });
          }
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error loading table unique value counts", error);
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
    (startIndex: number, endIndex: number): GroupAnnotationsTableRowData[] =>
      sortedGroups?.slice(startIndex, endIndex).map((group) => ({ group })) ??
      [],
    [sortedGroups],
  );

  const columnDefs = useMemo(() => {
    if (sortedGroups === null) {
      return [];
    }
    const columnDefs: GroupAnnotationsTableColumnDef[] = [
      { id: "group", header: groupByColumn, accessorKey: "group" },
    ];
    if (extraGroupColumnDefs !== undefined) {
      columnDefs.push(...extraGroupColumnDefs);
    }
    return columnDefs;
  }, [sortedGroups, groupByColumn, extraGroupColumnDefs]);

  return (
    <VirtualTable
      rowCount={sortedGroups?.length ?? 0}
      getRows={getRows}
      getRowId={(row) => row.group}
      columnDefs={columnDefs}
      rowHeight={rowHeight}
      height={height}
    />
  );
}
