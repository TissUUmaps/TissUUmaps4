import { type ItemsData } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { SimpleSelect } from "@/components/common/simple-select";
import { useControlled } from "@/hooks/useControlled";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
import { cn } from "@/lib/utils";
import { useTissUUmaps } from "@/store";

import { ItemsDataTable } from "./ItemsDataTable";

export type ItemsDataWidgetProps = {
  data: ItemsData;
  tableHeight: number;
  selectedTable?: string | null;
  selectedGroupByColumn?: string | null;
  onSelectedTableChange?: (table: string | null) => void;
  onSelectedGroupByColumnChange?: (column: string | null) => void;
  className?: string;
};

export function ItemsDataWidget({
  data,
  tableHeight,
  selectedTable: controlledSelectedTable,
  selectedGroupByColumn: controlledSelectedGroupByColumn,
  onSelectedTableChange: setControlledSelectedTable,
  onSelectedGroupByColumnChange: setControlledSelectedGroupByColumn,
  className,
}: ItemsDataWidgetProps) {
  const [selectedTable, setSelectedTable] = useControlled(
    controlledSelectedTable,
    setControlledSelectedTable,
    null,
  );
  const [selectedGroupByColumn, setSelectedGroupByColumn] = useControlled(
    controlledSelectedGroupByColumn,
    setControlledSelectedGroupByColumn,
    null,
  );

  const tables = useTissUUmaps((state) => state.tables);
  const { suggestTableColumnQueries, resolveTableColumnQuery } =
    useTableColumnSelector(selectedTable);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Data
      </FieldsetLegend>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 items-center">
        <Field className="contents">
          <FieldLabel>Table:</FieldLabel>
          <SimpleSelect
            items={tables}
            itemLabel={(table) => table.name}
            itemValue={(table) => table.id}
            value={selectedTable}
            onValueChange={setSelectedTable}
          />
        </Field>
        <Field className="contents">
          <FieldLabel>Group by:</FieldLabel>
          <SimpleAsyncCombobox
            suggestQueries={suggestTableColumnQueries}
            getItem={resolveTableColumnQuery}
            itemQuery={(column) => column}
            selectedItem={selectedGroupByColumn}
            onSelectedItemChange={setSelectedGroupByColumn}
          />
        </Field>
      </div>
      <ItemsDataTable
        data={data}
        height={tableHeight}
        table={selectedTable}
        groupByColumn={selectedGroupByColumn}
      />
    </Fieldset>
  );
}
