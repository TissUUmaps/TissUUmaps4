import { useMemo } from "react";

import {
  VirtualTable,
  type VirtualTableColumnDef,
} from "@/components/common/virtual-table";

import { rowHeight } from "./rowHeight";
import { useGroupRows } from "./useGroupRows";

export type AnnotationsTableGroupRowData = {
  group: string;
};

export type AnnotationsTableGroupColumnDef =
  VirtualTableColumnDef<AnnotationsTableGroupRowData>;

export type AnnotationsGroupTableProps = {
  height: number;
  table: string;
  groupByColumn: string;
  extraGroupColumnDefs?: AnnotationsTableGroupColumnDef[];
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
    const columnDefs: AnnotationsTableGroupColumnDef[] = [
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
