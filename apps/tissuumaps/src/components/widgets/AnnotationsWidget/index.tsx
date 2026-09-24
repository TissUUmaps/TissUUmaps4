import type { ItemsData } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { TableColumnInput } from "@/components/widgets/TableColumnInput";
import { useControlled } from "@/hooks/useControlled";
import { cn } from "@/lib/utils";

import {
  GroupAnnotationsTable,
  type GroupAnnotationsTableColumnDef,
} from "./GroupAnnotationsTable";
import {
  ItemAnnotationsTable,
  type ItemAnnotationsTableColumnDef,
} from "./ItemAnnotationsTable";

// rows have a fixed height, so that the visible range follows from the scroll
// offset alone; cells of extra columns must fit within it
const tableRowHeight = 36;

export type AnnotationsWidgetProps = {
  data?: ItemsData;
  tableHeight: number;
  table: string | null;
  selectedGroupByColumn?: string | null;
  onSelectedGroupByColumnChange?: (column: string | null) => void;
  extraItemColumnDefs?: ItemAnnotationsTableColumnDef[];
  extraGroupColumnDefs?: GroupAnnotationsTableColumnDef[];
  className?: string;
};

export function AnnotationsWidget({
  data,
  tableHeight,
  table,
  selectedGroupByColumn: controlledSelectedGroupByColumn,
  onSelectedGroupByColumnChange: setControlledSelectedGroupByColumn,
  extraItemColumnDefs,
  extraGroupColumnDefs,
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
      {table !== null && selectedGroupByColumn ? (
        <GroupAnnotationsTable
          height={tableHeight}
          rowHeight={tableRowHeight}
          table={table}
          groupByColumn={selectedGroupByColumn}
          extraGroupColumnDefs={extraGroupColumnDefs}
        />
      ) : (
        <ItemAnnotationsTable
          data={data}
          height={tableHeight}
          rowHeight={tableRowHeight}
          table={table}
          extraColumnDefs={extraItemColumnDefs}
        />
      )}
    </Fieldset>
  );
}
