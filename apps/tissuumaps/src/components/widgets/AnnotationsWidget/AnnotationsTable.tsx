import { useCallback, useEffect, useMemo, useState } from "react";

import type { GenericArray, ItemsData, TableData } from "@tissuumaps/core";

import {
  VirtualTable,
  type VirtualTableColumnDef,
} from "@/components/common/virtual-table";
import { useTableData } from "@/hooks/useData";

/**
 * Height of a table row in pixels
 *
 * Rows have a fixed height, so that the visible range follows from the scroll
 * offset alone. Cells of extra columns must fit within it, taller content is
 * clipped.
 */
const rowHeight = 36;

type LoadedGroups = {
  tableData: TableData;
  groupByColumn: string;
  tableGroups: GenericArray<string>;
};

export type AnnotationsTableRowData = {
  id: number;
  name?: string;
  annotated?: boolean;
};

export type AnnotationsTableGroupRowData = {
  group: string;
};

export type AnnotationsTableColumnDef =
  VirtualTableColumnDef<AnnotationsTableRowData>;

export type AnnotationsTableGroupColumnDef =
  VirtualTableColumnDef<AnnotationsTableGroupRowData>;

export type AnnotationsTableProps = {
  data?: ItemsData;
  height: number;
  table: string | null;
  groupByColumn?: string | null;
  extraColumnDefs?: AnnotationsTableColumnDef[];
  extraGroupColumnDefs?: AnnotationsTableGroupColumnDef[];
};

export function AnnotationsTable({
  data,
  height,
  table,
  groupByColumn,
  extraColumnDefs,
  extraGroupColumnDefs,
}: AnnotationsTableProps) {
  // the groups are kept with what they were loaded from, so that the ones of
  // a previous table or column are not shown as the current ones
  const [loadedGroups, setLoadedGroups] = useState<LoadedGroups | null>(null);

  const tableData = useTableData(table);

  const tableGroups =
    loadedGroups?.tableData === tableData &&
    loadedGroups.groupByColumn === groupByColumn
      ? loadedGroups.tableGroups
      : null;

  useEffect(() => {
    const abortController = new AbortController();
    if (tableData && groupByColumn) {
      tableData
        .loadUniqueValueCounts<string>(groupByColumn, {
          signal: abortController.signal,
        })
        .then((uniqueValueCounts) => {
          if (!abortController.signal.aborted) {
            setLoadedGroups({
              tableData,
              groupByColumn,
              tableGroups: Array.from(uniqueValueCounts.keys()),
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

  const grouped = Boolean(table && groupByColumn);

  const groupRows = useMemo(() => {
    if (!grouped || tableGroups === null) {
      return [];
    }
    const groupRows: AnnotationsTableGroupRowData[] = tableGroups.map(
      (group) => ({ group: String(group) }),
    );
    groupRows.sort((a, b) => a.group.localeCompare(b.group));
    return groupRows;
  }, [grouped, tableGroups]);

  // the ids and the per-index accessors the item rows are built from, so that
  // only the rows within the visible range have to be materialized
  const { ids, getName, annotatedIds } = useMemo(() => {
    let ids: number[] = [];
    let getName: ((index: number) => string | undefined) | undefined;
    let annotatedIds: Set<number> | undefined;
    if (data !== undefined) {
      ids = data.getIds();
      if (table !== null) {
        // the selected table governs the names; while it is still loading there
        // are none yet, rather than the object's own names, which would show a
        // different column for a moment and then be replaced
        if (tableData !== null) {
          const tableIds = tableData.getIds();
          annotatedIds = new Set(tableIds);
          const tableNames = tableData.getNames?.();
          if (tableNames !== undefined) {
            // table-backed items hand out the table's own ids array, so names
            // align by index; only other item types need the id lookup
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
    return { ids, getName, annotatedIds };
  }, [data, table, tableData]);

  const getRows = useCallback(
    (
      startIndex: number,
      endIndex: number,
    ): (AnnotationsTableRowData | AnnotationsTableGroupRowData)[] => {
      if (grouped) {
        return groupRows.slice(startIndex, endIndex);
      }
      const rows: AnnotationsTableRowData[] = [];
      for (let index = startIndex; index < endIndex; index++) {
        const id = ids[index]!;
        rows.push({
          id,
          name: getName?.(index),
          annotated: annotatedIds?.has(id),
        });
      }
      return rows;
    },
    [grouped, groupRows, ids, getName, annotatedIds],
  );

  const columnDefs = useMemo(() => {
    if (grouped) {
      if (tableGroups === null) {
        return [];
      }
      const columnDefs: AnnotationsTableGroupColumnDef[] = [
        { id: "group", header: groupByColumn!, accessorKey: "group" },
      ];
      if (extraGroupColumnDefs !== undefined) {
        columnDefs.push(...extraGroupColumnDefs);
      }
      return columnDefs;
    }
    const columnDefs: AnnotationsTableColumnDef[] = [
      { id: "id", header: "ID", accessorKey: "id" },
    ];
    if (getName !== undefined) {
      columnDefs.push({ id: "name", header: "Name", accessorKey: "name" });
    }
    if (extraColumnDefs !== undefined) {
      columnDefs.push(...extraColumnDefs);
    }
    return columnDefs;
  }, [
    grouped,
    groupByColumn,
    tableGroups,
    getName,
    extraColumnDefs,
    extraGroupColumnDefs,
  ]);

  return (
    <VirtualTable<AnnotationsTableRowData | AnnotationsTableGroupRowData>
      rowCount={grouped ? groupRows.length : ids.length}
      getRows={getRows}
      getRowId={(row) => ("group" in row ? row.group : String(row.id))}
      columnDefs={
        columnDefs as VirtualTableColumnDef<
          AnnotationsTableRowData | AnnotationsTableGroupRowData
        >[]
      }
      rowHeight={rowHeight}
      height={height}
      rowClassName={(row) =>
        !("group" in row) && row.annotated === false
          ? "text-muted-foreground"
          : undefined
      }
    />
  );
}
