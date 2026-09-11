"use no memo"; // https://github.com/TanStack/table/issues/5567
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";

import type { GenericArray, ItemsData } from "@tissuumaps/core";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTableData } from "@/hooks/useData";

export type ItemsDataTableRowData = {
  id: number;
  name?: string;
};

export type ItemsDataTableGroupRowData = {
  group: string;
};

export type ItemsDataTableProps = {
  data: ItemsData;
  height: number;
  table: string | null;
  groupByColumn?: string | null;
  extraColumnDefs?: ColumnDef<ItemsDataTableRowData>[];
  extraGroupColumnDefs?: ColumnDef<ItemsDataTableGroupRowData>[];
};

/**
 * Height of a table row in pixels
 *
 * Rows have a fixed height, so that the visible range follows from the scroll
 * offset alone. Cells of extra columns must fit within it, taller content is
 * clipped.
 */
const rowHeight = 36;

export function ItemsDataTable({
  data,
  height,
  table,
  groupByColumn,
  extraColumnDefs,
  extraGroupColumnDefs,
}: ItemsDataTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [tableGroups, setTableGroups] = useState<GenericArray<string> | null>(
    null,
  );

  const tableData = useTableData(table);

  const groupColumn = table !== null && groupByColumn ? groupByColumn : null;

  useEffect(() => {
    const abortController = new AbortController();
    setTableGroups(null);
    if (tableData && groupColumn) {
      tableData
        .loadUniqueValues<string>(groupColumn, {
          signal: abortController.signal,
        })
        .then((tableGroups) => {
          if (!abortController.signal.aborted) {
            setTableGroups(tableGroups);
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
  }, [tableData, groupColumn]);

  const groupRows = useMemo(() => {
    if (groupColumn === null || tableGroups === null) {
      return [];
    }
    const groupRows: ItemsDataTableGroupRowData[] = tableGroups.map(
      (group) => ({ group: String(group) }),
    );
    groupRows.sort((a, b) => a.group.localeCompare(b.group));
    return groupRows;
  }, [groupColumn, tableGroups]);

  const getName = useMemo(() => {
    if (table === null) {
      const names = data.getNames();
      if (names === undefined) {
        return undefined;
      }
      return (index: number) => names[index];
    }
    // the selected table governs the names; while it is still loading there
    // are none yet, rather than the object's own names, which would show a
    // different column for a moment and then be replaced
    if (tableData === null) {
      return undefined;
    }
    const tableNames = tableData.getNames();
    if (tableNames === undefined) {
      return undefined;
    }
    const ids = data.getIds();
    const tableIds = tableData.getIds();
    // table-backed points hand out the table's own ids array (TablePointsData),
    // so names align by index; only other item types need the id lookup
    if (tableIds === ids) {
      return (index: number) => tableNames[index];
    }
    const tableNamesById = new Map(
      tableIds.map((id, i) => [id, tableNames[i]!]),
    );
    return (index: number) => tableNamesById.get(ids[index]!);
  }, [data, table, tableData]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: groupColumn !== null ? groupRows.length : data.getSize(),
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
  });

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    // a hidden panel loses its scroll offset without raising a scroll event,
    // which would leave the rendered rows outside of the visible range
    const resizeObserver = new ResizeObserver(() => {
      const scrollOffset = rowVirtualizer.scrollOffset ?? 0;
      if (container.clientHeight > 0 && container.scrollTop !== scrollOffset) {
        container.scrollTop = scrollOffset;
      }
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
    };
  }, [rowVirtualizer]);

  // only the rows within the virtualizer's range are materialized, so that the
  // cost of the table does not depend on the number of items
  const virtualRows = rowVirtualizer.getVirtualItems();
  const firstIndex = virtualRows[0]?.index ?? 0;
  const lastIndex = (virtualRows[virtualRows.length - 1]?.index ?? -1) + 1;

  const rowData = useMemo(() => {
    if (groupColumn !== null) {
      return groupRows.slice(firstIndex, lastIndex);
    }
    const ids = data.getIds();
    const rowData: ItemsDataTableRowData[] = [];
    for (let index = firstIndex; index < lastIndex; index++) {
      rowData.push({ id: ids[index]!, name: getName?.(index) });
    }
    return rowData;
  }, [groupColumn, groupRows, data, getName, firstIndex, lastIndex]);

  const columnDefs = useMemo(() => {
    if (groupColumn !== null) {
      if (tableGroups === null) {
        return [];
      }
      const columnDefs: ColumnDef<ItemsDataTableGroupRowData>[] = [
        { id: "group", header: groupColumn, accessorKey: "group" },
      ];
      if (extraGroupColumnDefs !== undefined) {
        columnDefs.push(...extraGroupColumnDefs);
      }
      return columnDefs;
    }
    const columnDefs: ColumnDef<ItemsDataTableRowData>[] = [
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
    groupColumn,
    tableGroups,
    getName,
    extraColumnDefs,
    extraGroupColumnDefs,
  ]);

  const reactTable = useReactTable<
    ItemsDataTableRowData | ItemsDataTableGroupRowData
  >({
    data: rowData,
    columns: columnDefs as ColumnDef<
      ItemsDataTableRowData | ItemsDataTableGroupRowData
    >[],
    getRowId: (row) => ("group" in row ? row.group : String(row.id)),
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  const reactTableRows = reactTable.getRowModel().rows;

  return (
    <div
      ref={containerRef}
      className="overflow-auto relative"
      style={{ height: `${height}px` }}
    >
      <Table className="grid">
        <TableHeader className="grid sticky top-0 z-10 bg-background">
          {reactTable.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="flex w-full">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="flex h-auto p-0"
                  style={{ width: `${header.getSize()}px` }}
                  colSpan={header.colSpan}
                >
                  {!header.isPlaceholder &&
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody
          className="grid relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {virtualRows.map((virtualRow) => {
            const row = reactTableRows[virtualRow.index - firstIndex]!;
            return (
              <TableRow
                key={row.id}
                className="flex absolute w-full border-0 items-center"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="flex p-0 pt-1"
                    style={{ width: `${cell.column.getSize()}px` }}
                  >
                    {cell.getIsPlaceholder()
                      ? null
                      : flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
