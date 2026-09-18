import { useMemo } from "react";

import type { ItemsData } from "@tissuumaps/core";

import {
  VirtualTable,
  type VirtualTableColumnDef,
} from "@/components/common/virtual-table";

import { rowHeight } from "./rowHeight";
import { useItemRows } from "./useItemRows";

export type AnnotationsItemTableRowData = {
  id: number;
  name?: string;
  annotated?: boolean;
};

export type AnnotationsItemTableColumnDef =
  VirtualTableColumnDef<AnnotationsItemTableRowData>;

export type AnnotationsItemTableProps = {
  data?: ItemsData;
  height: number;
  table: string | null;
  extraColumnDefs?: AnnotationsItemTableColumnDef[];
};

export function AnnotationsItemTable({
  data,
  height,
  table,
  extraColumnDefs,
}: AnnotationsItemTableProps) {
  const { rowCount, getRows, named } = useItemRows(data, table);

  const columnDefs = useMemo(() => {
    const columnDefs: AnnotationsItemTableColumnDef[] = [
      { id: "id", header: "ID", accessorKey: "id" },
    ];
    if (named) {
      columnDefs.push({ id: "name", header: "Name", accessorKey: "name" });
    }
    if (extraColumnDefs !== undefined) {
      columnDefs.push(...extraColumnDefs);
    }
    return columnDefs;
  }, [named, extraColumnDefs]);

  return (
    <VirtualTable
      rowCount={rowCount}
      getRows={getRows}
      getRowId={(row) => String(row.id)}
      columnDefs={columnDefs}
      rowHeight={rowHeight}
      height={height}
      rowClassName={(row) =>
        row.annotated === false ? "text-muted-foreground" : undefined
      }
    />
  );
}
