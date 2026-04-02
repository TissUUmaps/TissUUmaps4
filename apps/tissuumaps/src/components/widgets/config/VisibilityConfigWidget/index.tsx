import { Field, FieldLabel } from "@/components/common/field";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { SimpleSelect } from "@/components/common/simple-select";
import { Switch } from "@/components/ui/switch";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
import { useTissUUmaps } from "@/store";

import { type VisibilityConfigWidgetAdapter } from "./adapter";

export { ActiveVisibilityConfigValue } from "./ActiveVisibilityConfigValue";
export { VisibilityConfigSourceToggleGroup } from "./VisibilityConfigSourceToggleGroup";

export type VisibilityConfigWidgetProps = {
  adapter: VisibilityConfigWidgetAdapter;
  className?: string;
};

export function VisibilityConfigWidget({
  adapter,
  className,
}: VisibilityConfigWidgetProps) {
  switch (adapter.currentSource) {
    case "constant":
      return (
        <ConstantVisibilityConfigWidget
          adapter={adapter}
          className={className}
        />
      );
    case "from":
      return (
        <FromVisibilityConfigWidget adapter={adapter} className={className} />
      );
    case "groupBy":
      return (
        <GroupByVisibilityConfigWidget
          adapter={adapter}
          className={className}
        />
      );
  }
}

type ConstantVisibilityConfigWidgetProps = {
  adapter: VisibilityConfigWidgetAdapter;
  className?: string;
};

function ConstantVisibilityConfigWidget({
  adapter,
  className,
}: ConstantVisibilityConfigWidgetProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    adapter;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Visibility</FieldLabel>
        <div className="flex flex-row items-center gap-x-2">
          <Switch checked={value} onCheckedChange={setValue} />
          {value ? "Visible" : "Hidden"}
        </div>
      </Field>
    </div>
  );
}

type FromVisibilityConfigWidgetProps = {
  adapter: VisibilityConfigWidgetAdapter;
  className?: string;
};

function FromVisibilityConfigWidget({
  adapter,
  className,
}: FromVisibilityConfigWidgetProps) {
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

type GroupByVisibilityConfigWidgetProps = {
  adapter: VisibilityConfigWidgetAdapter;
  className?: string;
};

function GroupByVisibilityConfigWidget({
  adapter,
  className,
}: GroupByVisibilityConfigWidgetProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = adapter;

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
