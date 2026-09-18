import { useMemo } from "react";

import {
  VirtualTable,
  type VirtualTableColumnDef,
} from "@/components/common/virtual-table";

import { rowHeight } from "./rowHeight";
import { useGroupRows } from "./useGroupRows";

export type AnnotationsGroupTableRowData = {
  group: string;
};

export type AnnotationsGroupTableColumnDef =
  VirtualTableColumnDef<AnnotationsGroupTableRowData>;

export type AnnotationsGroupTableProps = {
  height: number;
  table: string;
  groupByColumn: string;
  extraGroupColumnDefs?: AnnotationsGroupTableColumnDef[];
};

export function AnnotationsGroupTable({
  height,
  table,
  groupByColumn,
  extraGroupColumnDefs,
}: AnnotationsGroupTableProps) {
  const { rowCount, getRows, loaded } = useGroupRows(table, groupByColumn);

  const columnDefs = useMemo(() => {
    if (!loaded) {
      return [];
    }
    const columnDefs: AnnotationsGroupTableColumnDef[] = [
      { id: "group", header: groupByColumn, accessorKey: "group" },
    ];
    if (extraGroupColumnDefs !== undefined) {
      columnDefs.push(...extraGroupColumnDefs);
    }
    return columnDefs;
  }, [loaded, groupByColumn, extraGroupColumnDefs]);

  return (
    <VirtualTable
      rowCount={rowCount}
      getRows={getRows}
      getRowId={(row) => row.group}
      columnDefs={columnDefs}
      rowHeight={rowHeight}
      height={height}
    />
  );
}
