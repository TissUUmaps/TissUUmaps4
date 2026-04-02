import { Input } from "@/components/ui/input";

import { useTableColumnSelector } from "../../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../../store";
import { Field, FieldLabel } from "../../../common/field";
import { SimpleAsyncCombobox } from "../../../common/simple-combobox";
import { SimpleSelect } from "../../../common/simple-select";
import { type OpacityConfigWidgetState } from "./useOpacityConfigWidget";

export { ActiveOpacityConfigValue } from "./ActiveOpacityConfigValue";
export { OpacityConfigSourceToggleGroup } from "./OpacityConfigSourceToggleGroup";

export type OpacityConfigWidgetProps = {
  state: OpacityConfigWidgetState;
  className?: string;
};

export function OpacityConfigWidget({
  state,
  className,
}: OpacityConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return (
        <ConstantOpacityConfigWidget state={state} className={className} />
      );
    case "from":
      return <FromOpacityConfigWidget state={state} className={className} />;
    case "groupBy":
      return <GroupByOpacityConfigWidget state={state} className={className} />;
  }
}

type ConstantOpacityConfigWidgetProps = {
  state: OpacityConfigWidgetState;
  className?: string;
};

function ConstantOpacityConfigWidget({
  state,
  className,
}: ConstantOpacityConfigWidgetProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    state;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Opacity</FieldLabel>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(event) => {
            const opacity = event.target.valueAsNumber;
            if (Number.isFinite(opacity)) {
              setValue(Math.min(Math.max(0, opacity), 1));
            }
          }}
        />
      </Field>
    </div>
  );
}

type FromOpacityConfigWidgetProps = {
  state: OpacityConfigWidgetState;
  className?: string;
};

function FromOpacityConfigWidget({
  state,
  className,
}: FromOpacityConfigWidgetProps) {
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

type GroupByOpacityConfigWidgetProps = {
  state: OpacityConfigWidgetState;
  className?: string;
};

function GroupByOpacityConfigWidget({
  state,
  className,
}: GroupByOpacityConfigWidgetProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = state;

  const tables = useTissUUmaps((state) => state.tables);
  const opacityMaps = useTissUUmaps((state) => state.opacityMaps);

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
        <FieldLabel>Opacity map</FieldLabel>
        <SimpleSelect
          items={opacityMaps}
          itemLabel={(opacityMap) => opacityMap.name}
          itemValue={(opacityMap) => opacityMap.id}
          value={map}
          onValueChange={setMap}
        />
      </Field>
    </div>
  );
}
