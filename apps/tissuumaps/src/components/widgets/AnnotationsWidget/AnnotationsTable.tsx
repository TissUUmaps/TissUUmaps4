import type { ItemsData } from "@tissuumaps/core";

import {
  AnnotationsGroupTable,
  type AnnotationsTableGroupColumnDef,
} from "./AnnotationsGroupTable";
import {
  AnnotationsItemTable,
  type AnnotationsTableColumnDef,
} from "./AnnotationsItemTable";

export type AnnotationsTableProps = {
  data?: ItemsData;
  height: number;
  table: string | null;
  groupByColumn?: string | null;
  extraColumnDefs?: AnnotationsTableColumnDef[];
  extraGroupColumnDefs?: AnnotationsTableGroupColumnDef[];
};

export function AnnotationsTable({
  data,
  height,
  table,
  groupByColumn,
  extraColumnDefs,
  extraGroupColumnDefs,
}: AnnotationsTableProps) {
  if (table !== null && groupByColumn) {
    return (
      <AnnotationsGroupTable
        height={height}
        table={table}
        groupByColumn={groupByColumn}
        extraGroupColumnDefs={extraGroupColumnDefs}
      />
    );
  }
  return (
    <AnnotationsItemTable
      data={data}
      height={height}
      table={table}
      extraColumnDefs={extraColumnDefs}
    />
  );
}
