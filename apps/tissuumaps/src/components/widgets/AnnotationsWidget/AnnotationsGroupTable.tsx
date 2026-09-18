import { useCallback, useMemo } from "react";

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
  const groupRows = useGroupRows(table, groupByColumn);

  const getRows = useCallback(
    (startIndex: number, endIndex: number) =>
      groupRows?.slice(startIndex, endIndex) ?? [],
    [groupRows],
  );

  const columnDefs = useMemo(() => {
    if (groupRows === null) {
      return [];
    }
    const columnDefs: AnnotationsTableGroupColumnDef[] = [
      { id: "group", header: groupByColumn, accessorKey: "group" },
    ];
    if (extraGroupColumnDefs !== undefined) {
      columnDefs.push(...extraGroupColumnDefs);
    }
    return columnDefs;
  }, [groupRows, groupByColumn, extraGroupColumnDefs]);

  return (
    <VirtualTable
      rowCount={groupRows?.length ?? 0}
      getRows={getRows}
      getRowId={(row) => row.group}
      columnDefs={columnDefs}
      rowHeight={rowHeight}
      height={height}
    />
  );
}
