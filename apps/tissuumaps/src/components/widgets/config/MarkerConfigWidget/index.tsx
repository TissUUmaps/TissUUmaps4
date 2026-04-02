import { Field, FieldLabel } from "@/components/common/field";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { SimpleSelect } from "@/components/common/simple-select";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
import { useTissUUmaps } from "@/store";

import { type MarkerConfigWidgetAdapter } from "./adapter";
import { markers } from "./markers";

export { ActiveMarkerConfigValue } from "./ActiveMarkerConfigValue";
export { MarkerConfigSourceToggleGroup } from "./MarkerConfigSourceToggleGroup";

export type MarkerConfigWidgetProps = {
  adapter: MarkerConfigWidgetAdapter;
  className?: string;
};

export function MarkerConfigWidget({
  adapter,
  className,
}: MarkerConfigWidgetProps) {
  switch (adapter.currentSource) {
    case "constant":
      return (
        <ConstantMarkerConfigWidget adapter={adapter} className={className} />
      );
    case "from":
      return <FromMarkerConfigWidget adapter={adapter} className={className} />;
    case "groupBy":
      return (
        <GroupByMarkerConfigWidget adapter={adapter} className={className} />
      );
  }
}

type ConstantMarkerConfigWidgetProps = {
  adapter: MarkerConfigWidgetAdapter;
  className?: string;
};

function ConstantMarkerConfigWidget({
  adapter,
  className,
}: ConstantMarkerConfigWidgetProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    adapter;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Marker</FieldLabel>
        <SimpleSelect
          items={markers}
          itemLabel={(marker) => (
            <>
              {marker.icon} {marker.label}
            </>
          )}
          itemValue={(marker) => marker.value}
          value={value}
          onValueChange={(value) => {
            if (value !== null) {
              setValue(value);
            }
          }}
        />
      </Field>
    </div>
  );
}

type FromMarkerConfigWidgetProps = {
  adapter: MarkerConfigWidgetAdapter;
  className?: string;
};

function FromMarkerConfigWidget({
  adapter,
  className,
}: FromMarkerConfigWidgetProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
  } = adapter;

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
    </div>
  );
}

type GroupByMarkerConfigWidgetProps = {
  adapter: MarkerConfigWidgetAdapter;
  className?: string;
};

function GroupByMarkerConfigWidget({
  adapter,
  className,
}: GroupByMarkerConfigWidgetProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = adapter;

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
