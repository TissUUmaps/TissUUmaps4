import { colorPalettes } from "@tissuumaps/core";

import { useTableColumnSelector } from "../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { SimpleAsyncCombobox } from "../../common/simple-combobox";
import { SimpleSelect } from "../../common/simple-select";
import { type ColorConfigWidgetState } from "./useColorConfigWidget";

export type GroupByColorConfigWidgetProps = {
  state: ColorConfigWidgetState;
  className?: string;
};

export function GroupByColorConfigWidget({
  state,
  className,
}: GroupByColorConfigWidgetProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByPalette: palette,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByPalette: setPalette,
    setCurrentGroupByMap: setMap,
  } = state;

  const tables = useTissUUmaps((state) => state.tables);
  const colorMaps = useTissUUmaps((state) => state.colorMaps);

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
      <Field disabled={map !== null}>
        <FieldLabel>Color palette</FieldLabel>
        <SimpleSelect
          items={colorPalettes}
          itemLabel={(colorPalette) => colorPalette.name}
          itemValue={(colorPalette) => colorPalette.id}
          value={palette}
          onValueChange={setPalette}
        />
      </Field>
      <Field>
        <FieldLabel>Color map</FieldLabel>
        <SimpleSelect
          items={colorMaps}
          itemLabel={(colorMap) => colorMap.name}
          itemValue={(colorMap) => colorMap.id}
          value={map}
          onValueChange={setMap}
        />
      </Field>
    </div>
  );
}
