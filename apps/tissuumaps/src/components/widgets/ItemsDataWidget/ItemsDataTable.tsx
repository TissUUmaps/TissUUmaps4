"use no memo"; // https://github.com/TanStack/table/issues/5567
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getGroupedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type ItemsData,
  type MappableArrayLike,
  type TableData,
} from "@tissuumaps/core";

import { Button } from "@/components/ui/button";
import { useTissUUmaps } from "@/store";

export type ItemsDataTableRowData = {
  id: number;
  name?: string;
  group?: string;
};

export type ItemsDataTableProps = {
  data: ItemsData;
  height: number;
  table?: string | null;
  groupByColumn?: string | null;
  extraColumnDefs?: ColumnDef<ItemsDataTableRowData>[];
};

export function ItemsDataTable({
  data,
  height,
  table,
  groupByColumn,
  extraColumnDefs,
}: ItemsDataTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [tableData, setTableData] = useState<TableData | null>(null);
  const [tableGroups, setTableGroups] =
    useState<MappableArrayLike<string> | null>(null);

  const loadTable = useTissUUmaps((state) => state.loadTable);

  useEffect(() => {
    setTableData(null);
    if (table !== undefined && table !== null) {
      loadTable(table).then(setTableData, console.error);
    }
  }, [table, loadTable]);

  useEffect(() => {
    setTableGroups(null);
    if (
      tableData !== null &&
      groupByColumn !== undefined &&
      groupByColumn !== null
    ) {
      tableData
        .loadValues<string>(groupByColumn)
        .then(setTableGroups, console.error);
    }
  }, [tableData, groupByColumn]);

  const { rowData, columnDefs, grouping } = useMemo(() => {
    const ids = data.getIds();

    let names = data.getNames();
    let groups: (string | null)[] | undefined;
    if (tableData !== null) {
      const tableNames = tableData.getNames();
      if (tableNames !== undefined) {
        const tableIds = tableData.getIds();
        names = ids.map((id) => {
          const index = tableIds.indexOf(id);
          return index >= 0 ? tableNames[index]! : "";
        });
      }
      if (tableGroups !== null) {
        const tableIds = tableData.getIds();
        groups = ids.map((id) => {
          const index = tableIds.indexOf(id);
          return index >= 0 ? tableGroups[index]! : null;
        });
      }
    }

    const rowData: ItemsDataTableRowData[] = ids.map((id, i) => ({
      id,
      ...(names !== undefined && { name: names[i]! }),
      ...(groups !== undefined && { group: groups[i]! }),
    }));

    const columnDefs: ColumnDef<ItemsDataTableRowData>[] = [
      {
        id: "id",
        header: "ID",
        accessorKey: "id",
        aggregationFn: () => null,
        aggregatedCell: () => null,
      },
    ];
    if (names !== undefined) {
      columnDefs.push({
        id: "name",
        header: "Name",
        accessorKey: "name",
        aggregationFn: () => null,
        aggregatedCell: () => null,
      });
    }
    if (groups !== undefined) {
      columnDefs.push({
        id: "group",
        header: groupByColumn!,
        accessorKey: "group",
        cell: ({ getValue }) =>
          getValue() ?? <span className="italic">Other</span>,
      });
    }
    if (extraColumnDefs !== undefined) {
      columnDefs.push(...extraColumnDefs);
    }

    const grouping = groups !== undefined ? ["group"] : [];

    return { rowData, columnDefs, grouping };
  }, [data, tableData, tableGroups, groupByColumn, extraColumnDefs]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const reactTable = useReactTable({
    data: rowData,
    columns: columnDefs,
    state: { grouping },
    getRowId: (row) => row.id.toString(),
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
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
                  colSpan={header.colSpan}
                  style={{ display: "flex", width: header.getSize() }}
                >
                  {!header.isPlaceholder &&
                    flexRender(
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
          {reactTableRowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = reactTableRows[virtualRow.index]!;
            return (
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
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    style={{
                      display: "flex",
                      width: cell.column.getSize(),
                    }}
                  >
                    {cell.getIsPlaceholder() ? null : cell.getIsGrouped() ? (
                      <Button
                        variant="ghost"
                        onClick={row.getToggleExpandedHandler()}
                      >
                        {row.getIsExpanded() ? (
                          <ChevronDownIcon />
                        ) : (
                          <ChevronRightIcon />
                        )}{" "}
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}{" "}
                        ({row.subRows.length})
                      </Button>
                    ) : cell.getIsAggregated() ? (
                      flexRender(
                        cell.column.columnDef.aggregatedCell,
                        cell.getContext(),
                      )
                    ) : (
                      flexRender(cell.column.columnDef.cell, cell.getContext())
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
