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
import { cn } from "@/lib/utils";

export type AnnotationsTableRowData = {
  id: number;
  name?: string;
  annotated?: boolean;
};

export type AnnotationsTableGroupRowData = {
  group: string;
};

export type AnnotationsTableProps = {
  data?: ItemsData;
  height: number;
  table: string | null;
  groupByColumn?: string | null;
  extraColumnDefs?: ColumnDef<AnnotationsTableRowData>[];
  extraGroupColumnDefs?: ColumnDef<AnnotationsTableGroupRowData>[];
};

export function AnnotationsTable({
  data,
  height,
  table,
  groupByColumn,
  extraColumnDefs,
  extraGroupColumnDefs,
}: AnnotationsTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [tableGroups, setTableGroups] = useState<GenericArray<string> | null>(
    null,
  );

  const tableData = useTableData(table);

  useEffect(() => {
    const abortController = new AbortController();
    setTableGroups(null);
    if (tableData && groupByColumn) {
      tableData
        .loadValueCounts<string>(groupByColumn, {
          signal: abortController.signal,
        })
        .then((valueCounts) => {
          if (!abortController.signal.aborted) {
            setTableGroups(Array.from(valueCounts.keys()));
          }
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error loading table value counts", error);
          }
        });
    }
    return () => {
      abortController.abort();
    };
  }, [tableData, groupByColumn]);

  const { rowData, columnDefs } = useMemo(() => {
    if (table && groupByColumn) {
      if (tableGroups !== null) {
        const rowData: AnnotationsTableGroupRowData[] = tableGroups.map(
          (group) => ({ group: String(group) }),
        );
        rowData.sort((a, b) => a.group.localeCompare(b.group));
        const columnDefs: ColumnDef<AnnotationsTableGroupRowData>[] = [
          {
            id: "group",
            header: groupByColumn,
            accessorKey: "group",
          },
        ];
        if (extraGroupColumnDefs !== undefined) {
          columnDefs.push(...extraGroupColumnDefs);
        }
        return { rowData, columnDefs };
      }
      return { rowData: [], columnDefs: [] };
    }
    let ids: number[] = [];
    let names: (string | undefined)[] | undefined;
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
            const tableNamesById = new Map(
              tableIds.map((id, i) => [id, tableNames[i]!]),
            );
            names = ids.map((id) => tableNamesById.get(id));
          }
        }
      } else {
        names = data.getNames?.();
      }
    } else if (tableData !== null) {
      ids = tableData.getIds();
      names = tableData.getNames?.();
    }
    const rowData: AnnotationsTableRowData[] = ids.map((id, i) => ({
      id,
      name: names?.[i],
      annotated: annotatedIds?.has(id),
    }));
    const columnDefs: ColumnDef<AnnotationsTableRowData>[] = [
      { id: "id", header: "ID", accessorKey: "id" },
    ];
    if (names !== undefined) {
      columnDefs.push({ id: "name", header: "Name", accessorKey: "name" });
    }
    if (extraColumnDefs !== undefined) {
      columnDefs.push(...extraColumnDefs);
    }
    return { rowData, columnDefs };
  }, [
    data,
    table,
    groupByColumn,
    extraColumnDefs,
    extraGroupColumnDefs,
    tableData,
    tableGroups,
  ]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const reactTable = useReactTable<
    AnnotationsTableRowData | AnnotationsTableGroupRowData
  >({
    data: rowData,
    columns: columnDefs as ColumnDef<
      AnnotationsTableRowData | AnnotationsTableGroupRowData
    >[],
    getRowId: (row) => ("group" in row ? row.group : String(row.id)),
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
  });

  const reactTableRows = reactTable.getRowModel().rows;

  const reactTableRowVirtualizer = useVirtualizer({
    count: reactTableRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    getItemKey: (index) => reactTableRows[index]!.id,
  });

  return (
    <div
      ref={containerRef}
      className="overflow-auto relative"
      style={{ height: `${height}px` }}
    >
      <Table className="grid w-max min-w-full">
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
          style={{ height: `${reactTableRowVirtualizer.getTotalSize()}px` }}
        >
          {reactTableRowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = reactTableRows[virtualRow.index]!;
            const unannotated =
              !("group" in row.original) && row.original.annotated === false;
            return (
              <TableRow
                key={virtualRow.key}
                data-index={virtualRow.index} // required for dynamic row height measurement
                ref={(node) => reactTableRowVirtualizer.measureElement(node)} // measure dynamic row height
                className={cn(
                  "flex absolute w-full border-0 items-center",
                  unannotated && "text-muted-foreground",
                )}
                style={{ transform: `translateY(${virtualRow.start}px)` }}
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
