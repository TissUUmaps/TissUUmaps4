import { useTableColumnSelector } from "../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { SimpleAsyncCombobox } from "../../common/simple-combobox";
import { SimpleSelect } from "../../common/simple-select";
import { type VisibilityConfigWidgetState } from "./useVisibilityConfigWidget";

export type GroupByVisibilityConfigWidgetProps = {
  state: VisibilityConfigWidgetState;
  className?: string;
};

export function GroupByVisibilityConfigWidget({
  state,
  className,
}: GroupByVisibilityConfigWidgetProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = state;

  const tables = useTissUUmaps((state) => state.tables);
  const visibilityMaps = useTissUUmaps((state) => state.visibilityMaps);

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
        <FieldLabel>Visibility map</FieldLabel>
        <SimpleSelect
          items={visibilityMaps}
          itemLabel={(visibilityMap) => visibilityMap.name}
          itemValue={(visibilityMap) => visibilityMap.id}
          value={map}
          onValueChange={setMap}
        />
      </Field>
    </div>
  );
}
