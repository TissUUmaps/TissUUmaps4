import { type CoordinateSpace } from "@tissuumaps/core";

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useTableColumnSelector } from "../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../store";
import { Field, FieldItem, FieldLabel } from "../../common/field";
import { SimpleAsyncCombobox } from "../../common/simple-combobox";
import { SimpleSelect } from "../../common/simple-select";
import { type SizeConfigControlState } from "./useSizeConfigControl";

export type FromSizeConfigControlProps = {
  state: SizeConfigControlState;
  className?: string;
};

export function FromSizeConfigControl({
  state,
  className,
}: FromSizeConfigControlProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    currentFromUnit: unit,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
    setCurrentFromUnit: setUnit,
  } = state;

  const tables = useTissUUmaps((state) => state.tables);

  const { suggestTableColumnQueries, resolveTableColumnQuery } =
    useTableColumnSelector(table);

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-x-2">
        <Field>
          <FieldLabel>Source table</FieldLabel>
          <SimpleSelect
            items={tables}
            itemLabel={(table) => table.name}
            itemValue={(table) => table.id}
            value={table}
            onValueChange={setTable}
          />
        </Field>
        <Field disabled={table === null}>
          <FieldLabel>Source column</FieldLabel>
          <SimpleAsyncCombobox
            suggestQueries={suggestTableColumnQueries}
            getItem={resolveTableColumnQuery}
            itemQuery={(column) => column}
            selectedItem={column}
            onSelectedItemChange={setColumn}
          />
        </Field>
      </div>
      <Field>
        <FieldLabel>Size unit</FieldLabel>
        <RadioGroup
          value={unit}
          onValueChange={(value) => setUnit(value as CoordinateSpace)}
          className="flex gap-x-4"
        >
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"data" satisfies CoordinateSpace} />
            <FieldLabel>Data</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"layer" satisfies CoordinateSpace} />
            <FieldLabel>Layer</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"world" satisfies CoordinateSpace} />
            <FieldLabel>World</FieldLabel>
          </FieldItem>
        </RadioGroup>
      </Field>
    </div>
  );
}
