import { type ColumnDef } from "@tanstack/react-table";

import { type ItemsData } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { Fieldset, FieldsetLegend } from "@/components/common/fieldset";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { useControlled } from "@/hooks/useControlled";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
import { cn } from "@/lib/utils";

import {
  ItemsDataTable,
  type ItemsDataTableGroupRowData,
  type ItemsDataTableRowData,
} from "./ItemsDataTable";

export type ItemsDataWidgetProps = {
  data: ItemsData;
  tableHeight: number;
  selectedTable?: string | null;
  selectedGroupByColumn?: string | null;
  onSelectedGroupByColumnChange?: (column: string | null) => void;
  extraTableColumnDefs?: ColumnDef<ItemsDataTableRowData>[];
  extraTableGroupColumnDefs?: ColumnDef<ItemsDataTableGroupRowData>[];
  className?: string;
};

export function ItemsDataWidget({
  data,
  tableHeight,
  // The table is determined by the data source, not selected here.
  selectedTable = null,
  selectedGroupByColumn: controlledSelectedGroupByColumn,
  onSelectedGroupByColumnChange: setControlledSelectedGroupByColumn,
  extraTableColumnDefs,
  extraTableGroupColumnDefs,
  className,
}: ItemsDataWidgetProps) {
  const [selectedGroupByColumn, setSelectedGroupByColumn] = useControlled(
    controlledSelectedGroupByColumn,
    setControlledSelectedGroupByColumn,
    null,
  );

  const { suggestTableColumnQueries, resolveTableColumnQuery } =
    useTableColumnSelector(selectedTable);

  return (
    <Fieldset
      className={cn("flex flex-col gap-y-2 border rounded-md p-2", className)}
    >
      <FieldsetLegend className="font-medium text-foreground">
        Data
      </FieldsetLegend>
      <Field disabled={selectedTable === null}>
        <FieldLabel>Group by</FieldLabel>
        <SimpleAsyncCombobox
          suggestQueries={suggestTableColumnQueries}
          getItem={resolveTableColumnQuery}
          itemQuery={(column) => column}
          selectedItem={selectedGroupByColumn}
          onSelectedItemChange={setSelectedGroupByColumn}
        />
      </Field>
      <ItemsDataTable
        data={data}
        height={tableHeight}
        table={selectedTable}
        groupByColumn={selectedGroupByColumn}
        extraColumnDefs={extraTableColumnDefs}
        extraGroupColumnDefs={extraTableGroupColumnDefs}
      />
    </Fieldset>
  );
}
