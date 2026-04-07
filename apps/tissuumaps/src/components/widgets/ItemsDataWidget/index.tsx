import { useCallback, useState } from "react";

import { type ItemsData } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { SimpleSelect } from "@/components/common/simple-select";
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
  onSelectedTableChange,
  onSelectedGroupByColumnChange,
  className,
}: ItemsDataWidgetProps) {
  const [uncontrolledSelectedTable, setUncontrolledSelectedTable] = useState<
    string | null
  >(null);
  const [
    uncontrolledSelectedGroupByColumn,
    setUncontrolledSelectedGroupByColumn,
  ] = useState<string | null>(null);
  const selectedTable =
    controlledSelectedTable !== undefined
      ? controlledSelectedTable
      : uncontrolledSelectedTable;
  const selectedGroupByColumn =
    controlledSelectedGroupByColumn !== undefined
      ? controlledSelectedGroupByColumn
      : uncontrolledSelectedGroupByColumn;
  const setSelectedTable = useCallback(
    (table: string | null) => {
      setUncontrolledSelectedTable(table);
      if (onSelectedTableChange !== undefined) {
        onSelectedTableChange(table);
      }
    },
    [onSelectedTableChange],
  );
  const setSelectedGroupByColumn = useCallback(
    (column: string | null) => {
      setUncontrolledSelectedGroupByColumn(column);
      if (onSelectedGroupByColumnChange !== undefined) {
        onSelectedGroupByColumnChange(column);
      }
    },
    [onSelectedGroupByColumnChange],
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
