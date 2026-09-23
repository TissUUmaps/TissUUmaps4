import type { ItemsData } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { useControlled } from "@/hooks/useControlled";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
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

  const { suggestTableColumnQueries, resolveTableColumnQuery } =
    useTableColumnSelector(table);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Annotations
      </FieldsetLegend>
      <Field disabled={table === null}>
        <FieldLabel>Group by</FieldLabel>
        <SimpleAsyncCombobox
          suggestQueries={suggestTableColumnQueries}
          getItem={resolveTableColumnQuery}
          itemQuery={(column) => column}
          selectedItem={selectedGroupByColumn}
          onSelectedItemChange={setSelectedGroupByColumn}
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
