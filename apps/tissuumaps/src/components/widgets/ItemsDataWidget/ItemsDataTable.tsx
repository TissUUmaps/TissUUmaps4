"use no memo"; // https://github.com/TanStack/table/issues/5567
import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  type GenericArray,
  type ItemsData,
  type TableData,
} from "@tissuumaps/core";

import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTissUUmaps } from "@/store";

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
  table?: string | null;
  groupByColumn?: string | null;
  extraColumnDefs?: ColumnDef<ItemsDataTableRowData>[];
  extraGroupColumnDefs?: ColumnDef<ItemsDataTableGroupRowData>[];
};

export function ItemsDataTable({
  data,
  height,
  table,
  groupByColumn,
  extraColumnDefs,
  extraGroupColumnDefs,
}: ItemsDataTableProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [tableData, setTableData] = useState<TableData | null>(null);
  const [tableGroups, setTableGroups] = useState<GenericArray<string> | null>(
    null,
  );

  const loadTable = useTissUUmaps((state) => state.loadTable);
  const loadUniqueTableValues = useTissUUmaps(
    (state) => state.loadUniqueTableValues,
  );

  useEffect(() => {
    setTableData(null);
    if (table) {
      loadTable(table).then(setTableData, console.error);
    }
  }, [table, loadTable]);

  useEffect(() => {
    setTableGroups(null);
    if (table && groupByColumn) {
      loadUniqueTableValues<string>(table, groupByColumn).then(
        setTableGroups,
        console.error,
      );
    }
  }, [table, groupByColumn, loadUniqueTableValues]);

  const { rowData, columnDefs } = useMemo(() => {
    if (table && groupByColumn) {
      if (tableGroups !== null) {
        const rowData: ItemsDataTableGroupRowData[] = tableGroups.map(
          (group) => ({ group: String(group) }),
        );
        rowData.sort((a, b) => a.group.localeCompare(b.group));
        const columnDefs: ColumnDef<ItemsDataTableGroupRowData>[] = [
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
    const ids = data.getIds();
    let names: (string | undefined)[] | undefined;
    if (tableData !== null) {
      const tableNames = tableData.getNames();
      if (tableNames !== undefined) {
        const tableIds = tableData.getIds();
        const tableNamesById = new Map(
          tableIds.map((id, i) => [id, tableNames[i]!]),
        );
        names = ids.map((id) => tableNamesById.get(id));
      }
    } else {
      names = data.getNames();
    }
    const rowData: ItemsDataTableRowData[] = ids.map((id, i) => ({
      id: id,
      name: names !== undefined ? names[i] : undefined,
    }));
    const columnDefs: ColumnDef<ItemsDataTableRowData>[] = [
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

  const reactTableRowVirtualizer = useVirtualizer({
    count: reactTableRows.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 36,
    getItemKey: (index) => reactTableRows[index]!.id,
  });

  return (
    <TableContainer
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
          style={{ height: `${reactTableRowVirtualizer.getTotalSize()}px` }}
        >
          {reactTableRowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = reactTableRows[virtualRow.index]!;
            return (
              <TableRow
                key={virtualRow.key}
                data-index={virtualRow.index} // required for dynamic row height measurement
                ref={(node) => reactTableRowVirtualizer.measureElement(node)} // measure dynamic row height
                className="flex absolute w-full border-0 items-center"
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
    </TableContainer>
  );
}
