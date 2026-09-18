"use no memo"; // https://github.com/TanStack/table/issues/5567
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { observeElementOffset, useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useReducer, useRef, useState } from "react";

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

import { compressScrollRange } from "./scrollCompression";

/**
 * Height of a table row in pixels
 *
 * Rows have a fixed height, so that the visible range follows from the scroll
 * offset alone. Cells of extra columns must fit within it, taller content is
 * clipped.
 */
const rowHeight = 36;

/**
 * The tallest scroll content that is laid out, in pixels
 *
 * Browsers cap the height of an element at a few ten million pixels, Chrome
 * at about 33 million divided by the page zoom, and clamp anything taller, so
 * that a longer list could not be scrolled past the cap. Content beyond this
 * height is compressed instead, see {@link compressScrollRange}.
 */
const maxScrollContentHeight = 10_000_000;

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
  const headerRef = useRef<HTMLTableSectionElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(height);
  const compressionRef = useRef(1);
  const [, rerender] = useReducer((x: number) => x + 1, 0);

  const [tableGroups, setTableGroups] = useState<GenericArray<string> | null>(
    null,
  );

  const tableData = useTableData(table);

  useEffect(() => {
    const abortController = new AbortController();
    setTableGroups(null);
    if (tableData && groupByColumn) {
      tableData
        .loadUniqueValues<string>(groupByColumn, {
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

  useEffect(() => {
    const header = headerRef.current;
    if (header === null) {
      return;
    }
    const resizeObserver = new ResizeObserver(() =>
      setHeaderHeight(header.offsetHeight),
    );
    resizeObserver.observe(header);
    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: grouped ? groupRows.length : ids.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => rowHeight,
    // the virtualizer works in content positions while the element scrolls in
    // layout positions, which differ once the content is compressed
    observeElementOffset: (instance, onOffsetChange) =>
      observeElementOffset(instance, (layoutOffset, isScrolling) => {
        onOffsetChange(layoutOffset * compressionRef.current, isScrolling);
        if (compressionRef.current > 1) {
          rerender(); // the rows shift against the layout while scrolling
        }
      }),
  });

  const { layoutSize: layoutContentHeight, factor: compression } =
    compressScrollRange(
      headerHeight + rowVirtualizer.getTotalSize(),
      viewportHeight,
      maxScrollContentHeight,
    );
  useEffect(() => {
    compressionRef.current = compression;
  }, [compression]);

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) {
      return;
    }
    // a hidden panel loses its scroll offset without raising a scroll event,
    // which would leave the rendered rows outside of the visible range
    const resizeObserver = new ResizeObserver(() => {
      if (container.clientHeight === 0) {
        return;
      }
      setViewportHeight(container.clientHeight);
      const layoutOffset = Math.round(
        (rowVirtualizer.scrollOffset ?? 0) / compressionRef.current,
      );
      if (container.scrollTop !== layoutOffset) {
        container.scrollTop = layoutOffset;
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

  // Rows are placed at their content position, less how far the content has
  // run ahead of the layout at the current scroll position, which is nothing
  // while the content fits.
  const rowShift = (rowVirtualizer.scrollOffset ?? 0) * (1 - 1 / compression);
  const firstIndex = virtualRows[0]?.index ?? 0;
  const lastIndex = (virtualRows[virtualRows.length - 1]?.index ?? -1) + 1;

  const rowData = useMemo(() => {
    if (grouped) {
      return groupRows.slice(firstIndex, lastIndex);
    }
    const rowData: AnnotationsTableRowData[] = [];
    for (let index = firstIndex; index < lastIndex; index++) {
      const id = ids[index]!;
      rowData.push({
        id,
        name: getName?.(index),
        annotated: annotatedIds?.has(id),
      });
    }
    return rowData;
  }, [grouped, groupRows, ids, getName, annotatedIds, firstIndex, lastIndex]);

  const columnDefs = useMemo(() => {
    if (grouped) {
      if (tableGroups === null) {
        return [];
      }
      const columnDefs: ColumnDef<AnnotationsTableGroupRowData>[] = [
        { id: "group", header: groupByColumn!, accessorKey: "group" },
      ];
      if (extraGroupColumnDefs !== undefined) {
        columnDefs.push(...extraGroupColumnDefs);
      }
      return columnDefs;
    }
    const columnDefs: ColumnDef<AnnotationsTableRowData>[] = [
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

  return (
    <div
      ref={containerRef}
      className="overflow-auto relative"
      style={{ height: `${height}px` }}
    >
      <Table className="grid w-max min-w-full">
        <TableHeader
          ref={headerRef}
          className="grid sticky top-0 z-10 bg-background"
        >
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
          style={{ height: `${layoutContentHeight - headerHeight}px` }}
        >
          {virtualRows.map((virtualRow) => {
            const row = reactTableRows[virtualRow.index - firstIndex];
            if (row === undefined) {
              return null;
            }
            const unannotated =
              !("group" in row.original) && row.original.annotated === false;
            return (
              <TableRow
                key={row.id}
                className={cn(
                  "flex absolute w-full border-0 items-center overflow-hidden",
                  unannotated && "text-muted-foreground",
                )}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start - rowShift}px)`,
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
