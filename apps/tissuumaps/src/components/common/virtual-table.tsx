import {
  type ColumnDef,
  type RowData,
  columnSizingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { type ReactNode, useMemo } from "react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompressedRowVirtualizer } from "@/hooks/useCompressedRowVirtualizer";
import { cn } from "@/lib/utils";

/**
 * The table features a virtual table uses
 *
 * A table only has the APIs of the features registered here. Column sizing
 * gives every cell the width of its column; nothing else is needed, as the
 * rows are windowed and the columns are neither sorted, filtered nor hidden.
 */
const features = tableFeatures({ columnSizingFeature });

/**
 * Renders a header or cell template without turning it into a component
 *
 * `flexRender` would do the latter, so that a column definition rebuilt on a
 * state change remounts every header and cell, losing the focus and the open
 * popovers of the interactive ones.
 */
function renderTemplate<TContext>(
  template: string | ((context: TContext) => unknown) | undefined,
  context: TContext,
): ReactNode {
  if (typeof template === "function") {
    // the column definition types a template's return value as `any`
    return template(context) as ReactNode;
  }
  return template;
}

/**
 * A column definition of a virtual table
 *
 * Header and cell templates are called as plain functions while the table
 * renders, so they must not call hooks; they may return elements of
 * components that do.
 */
export type VirtualTableColumnDef<TRowData extends RowData> = ColumnDef<
  typeof features,
  TRowData
>;

export type VirtualTableProps<TRowData extends RowData> = {
  rowCount: number;
  /** Returns the rows within `[startIndex, endIndex)` */
  getRows: (startIndex: number, endIndex: number) => TRowData[];
  getRowId: (row: TRowData) => string;
  columnDefs: VirtualTableColumnDef<TRowData>[];
  rowHeight: number;
  height: number;
  /**
   * How many rows are rendered beyond each end of the visible range
   *
   * Rows outside of it are not rendered, so scrolling reveals blank space until
   * the next render; the overscan covers a scroll of up to this many rows.
   */
  overscan?: number;
  rowClassName?: (row: TRowData) => string | undefined;
  className?: string;
};

export function VirtualTable<TRowData extends RowData>({
  rowCount,
  getRows,
  getRowId,
  columnDefs,
  rowHeight,
  height,
  overscan = 2,
  rowClassName,
  className,
}: VirtualTableProps<TRowData>) {
  const {
    containerRef,
    headerRef,
    firstIndex,
    lastIndex,
    layoutRowsHeight,
    rowShift,
  } = useCompressedRowVirtualizer<HTMLTableSectionElement>(
    rowCount,
    rowHeight,
    height,
    overscan,
  );

  // only the rows within the visible range are materialized, so that the cost
  // of the table does not depend on the number of rows
  const rows = useMemo(
    () => getRows(firstIndex, lastIndex),
    [getRows, firstIndex, lastIndex],
  );

  const table = useTable<typeof features, TRowData>({
    features,
    data: rows,
    columns: columnDefs,
    getRowId,
  });

  const tableRows = table.getRowModel().rows;

  return (
    <div
      ref={containerRef}
      className={cn("overflow-auto relative", className)}
      style={{ height: `${height}px` }}
    >
      <Table className="grid w-max min-w-full">
        <TableHeader
          ref={headerRef}
          className="grid sticky top-0 z-10 bg-background"
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="flex w-full">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className="flex h-auto p-0"
                  style={{ width: `${header.getSize()}px` }}
                  colSpan={header.colSpan}
                >
                  {!header.isPlaceholder &&
                    renderTemplate(
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
          style={{ height: `${layoutRowsHeight}px` }}
        >
          {tableRows.map((row, index) => (
            <TableRow
              key={row.id}
              className={cn(
                "flex absolute w-full border-0 items-center overflow-hidden",
                rowClassName?.(row.original),
              )}
              style={{
                height: `${rowHeight}px`,
                transform: `translateY(${(firstIndex + index) * rowHeight - rowShift}px)`,
              }}
            >
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className="flex p-0 pt-1"
                  style={{ width: `${cell.column.getSize()}px` }}
                >
                  {renderTemplate(
                    cell.column.columnDef.cell,
                    cell.getContext(),
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
