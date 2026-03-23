import { colorPalettes } from "@tissuumaps/core";

import { Input } from "@/components/ui/input";

import { useTableColumnSelector } from "../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { SimpleAsyncCombobox } from "../../common/simple-combobox";
import { SimpleSelect } from "../../common/simple-select";
import { type ColorConfigControlState } from "./useColorConfigControl";

export type FromColorConfigControlProps = {
  state: ColorConfigControlState;
  className?: string;
};

export function FromColorConfigControl({
  state,
  className,
}: FromColorConfigControlProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    currentFromRangeMin: rangeMin,
    currentFromRangeMax: rangeMax,
    currentFromPalette: palette,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
    setCurrentFromRangeMin: setRangeMin,
    setCurrentFromRangeMax: setRangeMax,
    setCurrentFromPalette: setPalette,
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
        <FieldLabel>Color palette</FieldLabel>
        <SimpleSelect
          items={colorPalettes}
          itemLabel={(colorPalette) => colorPalette.name}
          itemValue={(colorPalette) => colorPalette.id}
          value={palette}
          onValueChange={setPalette}
        />
      </Field>
      <div className="grid grid-cols-2 gap-x-2">
        <Field>
          <FieldLabel>Min. value</FieldLabel>
          <Input
            type="number"
            value={rangeMin ?? ""}
            onChange={(event) =>
              setRangeMin(event.target.value ? +event.target.value : null)
            }
          />
        </Field>
        <Field>
          <FieldLabel>Max. value</FieldLabel>
          <Input
            type="number"
            value={rangeMax ?? ""}
            onChange={(event) =>
              setRangeMax(event.target.value ? +event.target.value : null)
            }
          />
        </Field>
      </div>
    </div>
  );
}
