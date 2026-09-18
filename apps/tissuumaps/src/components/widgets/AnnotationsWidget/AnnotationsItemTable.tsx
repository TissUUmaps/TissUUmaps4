import { useMemo } from "react";

import type { ItemsData } from "@tissuumaps/core";

import {
  VirtualTable,
  type VirtualTableColumnDef,
} from "@/components/common/virtual-table";

import { rowHeight } from "./rowHeight";
import { useItemRows } from "./useItemRows";

export type AnnotationsTableRowData = {
  id: number;
  name?: string;
  annotated?: boolean;
};

export type AnnotationsTableColumnDef =
  VirtualTableColumnDef<AnnotationsTableRowData>;

export type AnnotationsItemTableProps = {
  data?: ItemsData;
  height: number;
  table: string | null;
  extraColumnDefs?: AnnotationsTableColumnDef[];
};

export function AnnotationsItemTable({
  data,
  height,
  table,
  extraColumnDefs,
}: AnnotationsItemTableProps) {
  const { rowCount, getRows, named } = useItemRows(data, table);

  const columnDefs = useMemo(() => {
    const columnDefs: AnnotationsTableColumnDef[] = [
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
