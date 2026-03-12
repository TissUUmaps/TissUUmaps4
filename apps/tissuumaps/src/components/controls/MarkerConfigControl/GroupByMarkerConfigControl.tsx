import { useTableColumnSelector } from "../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { SimpleAsyncCombobox } from "../../common/simple-combobox";
import { SimpleSelect } from "../../common/simple-select";
import { type MarkerConfigControlState } from "./useMarkerConfigControl";

export type GroupByMarkerConfigControlProps = {
  state: MarkerConfigControlState;
  className?: string;
};

export function GroupByMarkerConfigControl({
  state,
  className,
}: GroupByMarkerConfigControlProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = state;

  const tables = useTissUUmaps((state) => state.tables);
  const markerMaps = useTissUUmaps((state) => state.markerMaps);

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
        <FieldLabel>Marker map</FieldLabel>
        <SimpleSelect
          items={markerMaps}
          itemLabel={(markerMap) => markerMap.name}
          itemValue={(markerMap) => markerMap.id}
          value={map}
          onValueChange={setMap}
        />
      </Field>
    </div>
  );
}
