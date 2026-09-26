import type { ColumnSort, ColumnVisibilityState } from "@tanstack/react-table";
import { ArrowDownIcon, ArrowUpIcon } from "lucide-react";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import {
  VirtualTable,
  type VirtualTableColumnDef,
} from "@/components/common/virtual-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

import {
  GroupColumnPicker,
  type GroupColumnPickerProps,
} from "./GroupColumnPicker";
import { GroupVisibilityCell } from "./cells/GroupVisibilityCell";

type GroupAnnotationsTableRowData = {
  group: string;
  count: number;
};

/** A column of the group table, showing a value of every group */
export type GroupColumn = {
  id: string;
  header: string;
  size: number;

  /** Whether the cells are grayed out, as editing them changes the property source */
  isInactive: boolean;

  /** Whether the column is shown until the user picks the columns */
  isShownByDefault: boolean;

  /** The value of a group the rows sort by; the column is not sortable without */
  getSortValue?: (group: string) => number | string;
  renderCell: (group: string) => ReactNode;
};

/** How the group table shows and toggles the visibility of a group */
export type GroupVisibility = {
  isVisible: (group: string) => boolean;

  /** Whether the eye buttons are grayed out, as toggling them changes the property source */
  isInactive: boolean;

  onVisibleChange: (groups: string[], visible: boolean) => void;
};

/** Grays out the cells of an inactive column */
function inactiveCell(isInactive: boolean, cell: ReactNode): ReactNode {
  return isInactive ? (
    <div
      className="flex w-full opacity-50"
      title="Edit to group by this column"
    >
      {cell}
    </div>
  ) : (
    cell
  );
}

/** The group rows are listed by name until a column is sorted by */
const defaultSorting: ColumnSort = { id: "group", desc: false };

/** Compares text with its numbers by value, so that `2` sorts before `10` */
const textCollator = new Intl.Collator(undefined, { numeric: true });

/**
 * Compares two sort values, numbers numerically and strings as text
 *
 * @param a - The first sort value
 * @param b - The second sort value
 * @returns A negative number if `a` sorts first, a positive one if `b` does
 */
function compareSortValues(a: number | string, b: number | string): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return textCollator.compare(String(a), String(b));
}

export type GroupAnnotationsTableProps = {
  height: number;
  rowHeight: number;
  tableId: string;
  groupByColumn: string;
  groupCounts: Map<string, number> | null;
  groupVisibility?: GroupVisibility;
  groupColumns?: GroupColumn[];
};

export function GroupAnnotationsTable({
  height,
  rowHeight,
  tableId,
  groupByColumn,
  groupCounts,
  groupVisibility,
  groupColumns,
}: GroupAnnotationsTableProps) {
  const [sorting, setSorting] = useState<ColumnSort>(defaultSorting);
  const [shownColumns, setShownColumns] = useState<ColumnVisibilityState>({});

  const pickableColumns = useMemo(() => {
    const pickableColumns: GroupColumnPickerProps["columns"] = [];
    const pickColumn = (
      id: string,
      header: string,
      isShownByDefault: boolean,
    ) => {
      pickableColumns.push({
        id,
        header,
        isShown: shownColumns[id] ?? isShownByDefault,
      });
    };
    if (groupVisibility !== undefined) {
      pickColumn("visible", "Visibility", true);
    }
    pickColumn("count", "Count", true);
    for (const groupColumn of groupColumns ?? []) {
      pickColumn(
        groupColumn.id,
        groupColumn.header,
        groupColumn.isShownByDefault,
      );
    }
    return pickableColumns;
  }, [shownColumns, groupVisibility, groupColumns]);

  const shownColumnIds = useMemo(
    () =>
      new Set(
        pickableColumns
          .filter((pickableColumn) => pickableColumn.isShown)
          .map((pickableColumn) => pickableColumn.id),
      ),
    [pickableColumns],
  );

  const activeSorting =
    sorting.id === "group" || shownColumnIds.has(sorting.id)
      ? sorting
      : defaultSorting;

  // one row is materialized per group, not per item: a column whose values are
  // all distinct belongs in the item table, which windows its rows
  const groupRows = useMemo(() => {
    if (groupCounts === null) {
      return [];
    }
    const groupRows = Array.from(groupCounts, ([group, count]) => ({
      group,
      count,
    }));
    const getSortValue =
      activeSorting.id === "count"
        ? (group: string) => groupCounts.get(group) ?? 0
        : groupColumns?.find(
            (groupColumn) => groupColumn.id === activeSorting.id,
          )?.getSortValue;
    const order = activeSorting.desc ? -1 : 1;
    groupRows.sort(
      (a, b) =>
        order *
        ((getSortValue !== undefined
          ? compareSortValues(getSortValue(a.group), getSortValue(b.group))
          : 0) || textCollator.compare(a.group, b.group)),
    );
    return groupRows;
  }, [groupCounts, activeSorting, groupColumns]);

  const getRows = useCallback(
    (startIndex: number, endIndex: number): GroupAnnotationsTableRowData[] =>
      groupRows.slice(startIndex, endIndex),
    [groupRows],
  );

  const columnDefs = useMemo(() => {
    const sortableHeader = (id: string, title: string) => () => (
      <Button
        variant="ghost"
        size="sm"
        className="h-full w-full justify-start rounded-none px-1 pr-2 text-xs font-medium text-inherit hover:bg-transparent hover:text-foreground"
        title={`Sort by ${title}`}
        onClick={() => {
          setSorting({
            id,
            desc: activeSorting.id === id && !activeSorting.desc,
          });
        }}
      >
        <span className="truncate">{title}</span>
        {activeSorting.id === id &&
          (activeSorting.desc ? (
            <ArrowDownIcon className="size-3.5" />
          ) : (
            <ArrowUpIcon className="size-3.5" />
          ))}
      </Button>
    );
    const columnDefs: VirtualTableColumnDef<GroupAnnotationsTableRowData>[] =
      [];
    if (groupVisibility !== undefined && shownColumnIds.has("visible")) {
      const { isVisible, isInactive, onVisibleChange } = groupVisibility;
      const groups = groupRows.map((groupRow) => groupRow.group);
      const numVisibleGroups = groups.filter(isVisible).length;
      columnDefs.push({
        id: "visible",
        size: 36,
        enableResizing: false,
        header: () =>
          inactiveCell(
            isInactive,
            <span className="flex h-6 w-full items-center px-1">
              <Checkbox
                checked={
                  groups.length > 0 && numVisibleGroups === groups.length
                }
                indeterminate={
                  numVisibleGroups > 0 && numVisibleGroups < groups.length
                }
                onCheckedChange={(checked) => {
                  onVisibleChange(groups, checked);
                }}
                title="Show listed groups"
                aria-label="Show listed groups"
              />
            </span>,
          ),
        cell: ({ row }) =>
          inactiveCell(
            isInactive,
            <GroupVisibilityCell
              visible={isVisible(row.original.group)}
              onVisibleChange={(visible) => {
                onVisibleChange([row.original.group], visible);
              }}
              highlightedItemGroup={{
                tableId,
                column: groupByColumn,
                group: row.original.group,
              }}
            />,
          ),
      });
    }
    columnDefs.push({
      id: "group",
      header: sortableHeader("group", groupByColumn),
      size: 110,
      cell: ({ row }) => <span className="truncate">{row.original.group}</span>,
    });
    if (shownColumnIds.has("count")) {
      columnDefs.push({
        id: "count",
        header: sortableHeader("count", "Count"),
        cell: ({ row }) => row.original.count.toLocaleString(),
        size: 70,
      });
    }
    for (const groupColumn of groupColumns ?? []) {
      if (!shownColumnIds.has(groupColumn.id)) {
        continue;
      }
      columnDefs.push({
        id: groupColumn.id,
        header:
          groupColumn.getSortValue !== undefined
            ? sortableHeader(groupColumn.id, groupColumn.header)
            : groupColumn.header,
        size: groupColumn.size,
        cell: ({ row }) =>
          inactiveCell(
            groupColumn.isInactive,
            groupColumn.renderCell(row.original.group),
          ),
      });
    }
    return columnDefs;
  }, [
    activeSorting,
    shownColumnIds,
    groupVisibility,
    groupRows,
    tableId,
    groupByColumn,
    groupColumns,
  ]);

  return (
    <VirtualTable
      rowCount={groupRows.length}
      getRows={getRows}
      getRowId={(row) => row.group}
      columnDefs={columnDefs}
      rowHeight={rowHeight}
      height={height}
      headerAction={
        <GroupColumnPicker
          columns={pickableColumns}
          onShownChange={(id, isShown) => {
            setShownColumns((shownColumns) => ({
              ...shownColumns,
              [id]: isShown,
            }));
          }}
        />
      }
    />
  );
}
