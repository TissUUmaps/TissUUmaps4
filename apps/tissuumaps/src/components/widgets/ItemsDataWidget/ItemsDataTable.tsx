"use no memo"; // https://github.com/TanStack/table/issues/5567
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useMemo, useRef } from "react";

import { type ItemsData } from "@tissuumaps/core";

export type ItemsDataTableProps = {
  data: ItemsData;
  height: number;
  table?: string | null;
  groupByColumn?: string | null;
};

export function ItemsDataTable({ data, height }: ItemsDataTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const { rowData, columnDefs } = useMemo(() => {
    const rowData = data.getIds().map((id) => ({ id }));
    const columnDefs = [{ id: "id", header: "ID", accessorKey: "id" }];
    // TODO add name column (optional) and groupBy columns from table
    return { rowData, columnDefs };
  }, [data]);

  // TODO add groupBy support based on table and groupByColumn
  // eslint-disable-next-line react-hooks/incompatible-library
  const reactTable = useReactTable({
    data: rowData,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id.toString(),
  });

  const reactTableRows = reactTable.getRowModel().rows;

  const reactTableRowVirtualizer = useVirtualizer({
    count: reactTableRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 35, // TODO estimated row height
    getItemKey: (index) => reactTableRows[index]!.id, // see getRowId in useReactTable
  });

  return (
    <div
      ref={containerRef}
      style={{
        overflow: "auto",
        position: "relative",
        height: `${height}px`,
      }}
    >
      <table style={{ display: "grid" }}>
        <thead
          style={{ display: "grid", position: "sticky", top: 0, zIndex: 1 }}
        >
          {reactTable.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} style={{ display: "flex", width: "100%" }}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ display: "flex", width: header.getSize() }}
                >
                  {flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody
          style={{
            display: "grid",
            height: `${reactTableRowVirtualizer.getTotalSize()}px`,
            position: "relative",
          }}
        >
          {reactTableRowVirtualizer.getVirtualItems().map((virtualRow) => (
            <tr
              key={virtualRow.key}
              data-index={virtualRow.index} // required for dynamic row height measurement
              ref={(node) => reactTableRowVirtualizer.measureElement(node)} // measure dynamic row height
              style={{
                display: "flex",
                position: "absolute",
                transform: `translateY(${virtualRow.start}px)`,
                width: "100%",
              }}
            >
              {reactTableRows[virtualRow.index]!.getVisibleCells().map(
                (cell) => (
                  <td
                    key={cell.id}
                    style={{ display: "flex", width: cell.column.getSize() }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
