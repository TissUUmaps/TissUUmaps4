import { Switch } from "@/components/ui/switch";

import { useTableColumnSelector } from "../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../store";
import { Field, FieldLabel } from "../../common/field";
import { SimpleAsyncCombobox } from "../../common/simple-combobox";
import { SimpleSelect } from "../../common/simple-select";
import { type VisibilityConfigWidgetState } from "./useVisibilityConfigWidget";

export { ActiveVisibilityConfigValue } from "./ActiveVisibilityConfigValue";
export { VisibilityConfigSourceToggleGroup } from "./VisibilityConfigSourceToggleGroup";

export type VisibilityConfigWidgetProps = {
  state: VisibilityConfigWidgetState;
  className?: string;
};

export function VisibilityConfigWidget({
  state,
  className,
}: VisibilityConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return (
        <ConstantVisibilityConfigWidget state={state} className={className} />
      );
    case "from":
      return <FromVisibilityConfigWidget state={state} className={className} />;
    case "groupBy":
      return (
        <GroupByVisibilityConfigWidget state={state} className={className} />
      );
  }
}

type ConstantVisibilityConfigWidgetProps = {
  state: VisibilityConfigWidgetState;
  className?: string;
};

function ConstantVisibilityConfigWidget({
  state,
  className,
}: ConstantVisibilityConfigWidgetProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    state;

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
  state: VisibilityConfigWidgetState;
  className?: string;
};

function FromVisibilityConfigWidget({
  state,
  className,
}: FromVisibilityConfigWidgetProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
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
    </div>
  );
}

type GroupByVisibilityConfigWidgetProps = {
  state: VisibilityConfigWidgetState;
  className?: string;
};

function GroupByVisibilityConfigWidget({
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
