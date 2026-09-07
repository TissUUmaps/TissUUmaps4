import type { ColumnDef } from "@tanstack/react-table";

import type { ItemsData } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { TableColumnInput } from "@/components/widgets/TableColumnInput";
import { useControlled } from "@/hooks/useControlled";
import { cn } from "@/lib/utils";

import {
  AnnotationsTable,
  type AnnotationsTableGroupRowData,
  type AnnotationsTableRowData,
} from "./AnnotationsTable";

export type AnnotationsWidgetProps = {
  data?: ItemsData;
  tableHeight: number;
  table: string | null;
  selectedGroupByColumn?: string | null;
  onSelectedGroupByColumnChange?: (column: string | null) => void;
  extraTableColumnDefs?: ColumnDef<AnnotationsTableRowData>[];
  extraTableGroupColumnDefs?: ColumnDef<AnnotationsTableGroupRowData>[];
  className?: string;
};

export function AnnotationsWidget({
  data,
  tableHeight,
  table,
  selectedGroupByColumn: controlledSelectedGroupByColumn,
  onSelectedGroupByColumnChange: setControlledSelectedGroupByColumn,
  extraTableColumnDefs,
  extraTableGroupColumnDefs,
  className,
}: AnnotationsWidgetProps) {
  const [selectedGroupByColumn, setSelectedGroupByColumn] = useControlled(
    controlledSelectedGroupByColumn,
    setControlledSelectedGroupByColumn,
    null,
  );

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Annotations
      </FieldsetLegend>
      <Field disabled={table === null}>
        <FieldLabel>Group by</FieldLabel>
        <TableColumnInput
          tableId={table}
          value={selectedGroupByColumn}
          onValueChange={setSelectedGroupByColumn}
        />
      </Field>
      <AnnotationsTable
        data={data}
        height={tableHeight}
        table={table}
        groupByColumn={selectedGroupByColumn}
        extraColumnDefs={extraTableColumnDefs}
        extraGroupColumnDefs={extraTableGroupColumnDefs}
      />
    </Fieldset>
  );
}
