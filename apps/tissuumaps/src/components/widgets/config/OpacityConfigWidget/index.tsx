import { MathUtils } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { SimpleSelect } from "@/components/common/simple-select";
import { Input } from "@/components/ui/input";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
import { useTissUUmaps } from "@/store";

import { type OpacityConfigWidgetAdapter } from "./adapter";

export { ActiveOpacityConfigValue } from "./ActiveOpacityConfigValue";
export { OpacityConfigSourceToggleGroup } from "./OpacityConfigSourceToggleGroup";

export type OpacityConfigWidgetProps = {
  adapter: OpacityConfigWidgetAdapter;
  className?: string;
};

export function OpacityConfigWidget({
  adapter,
  className,
}: OpacityConfigWidgetProps) {
  switch (adapter.currentSource) {
    case "constant":
      return (
        <ConstantOpacityConfigWidget adapter={adapter} className={className} />
      );
    case "from":
      return (
        <FromOpacityConfigWidget adapter={adapter} className={className} />
      );
    case "groupBy":
      return (
        <GroupByOpacityConfigWidget adapter={adapter} className={className} />
      );
  }
}

type ConstantOpacityConfigWidgetProps = {
  adapter: OpacityConfigWidgetAdapter;
  className?: string;
};

function ConstantOpacityConfigWidget({
  adapter,
  className,
}: ConstantOpacityConfigWidgetProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    adapter;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Opacity</FieldLabel>
        <Input
          type="number"
          inputMode="decimal"
          step={0.05}
          min={0}
          max={1}
          value={value}
          onChange={(event) => {
            const newValue = event.target.valueAsNumber;
            if (!isNaN(newValue)) {
              setValue(MathUtils.clamp(newValue, 0, 1));
            }
          }}
        />
      </Field>
    </div>
  );
}

type FromOpacityConfigWidgetProps = {
  adapter: OpacityConfigWidgetAdapter;
  className?: string;
};

function FromOpacityConfigWidget({
  adapter,
  className,
}: FromOpacityConfigWidgetProps) {
  const {
    tableId,
    currentFromColumn: column,
    setCurrentFromColumn: setColumn,
  } = adapter;

  const { suggestTableColumnQueries, resolveTableColumnQuery } =
    useTableColumnSelector(tableId);

  return (
    <div className={className}>
      <Field disabled={tableId === null}>
        <FieldLabel>Table column</FieldLabel>
        <SimpleAsyncCombobox
          suggestQueries={suggestTableColumnQueries}
          getItem={resolveTableColumnQuery}
          itemQuery={(column) => column}
          selectedItem={column}
          onSelectedItemChange={setColumn}
        />
      </Field>
    </div>
  );
}

type GroupByOpacityConfigWidgetProps = {
  adapter: OpacityConfigWidgetAdapter;
  className?: string;
};

function GroupByOpacityConfigWidget({
  adapter,
  className,
}: GroupByOpacityConfigWidgetProps) {
  const {
    tableId,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = adapter;

  const opacityMaps = useTissUUmaps((state) => state.opacityMaps);

  const { suggestTableColumnQueries, resolveTableColumnQuery } =
    useTableColumnSelector(tableId);

  return (
    <div className={className}>
      <Field disabled={tableId === null}>
        <FieldLabel>Table column</FieldLabel>
        <SimpleAsyncCombobox
          suggestQueries={suggestTableColumnQueries}
          getItem={resolveTableColumnQuery}
          itemQuery={(column) => column}
          selectedItem={column}
          onSelectedItemChange={setColumn}
        />
      </Field>
      <Field>
        <FieldLabel>Opacity map</FieldLabel>
        <SimpleSelect
          items={opacityMaps}
          itemLabel={(opacityMap) => opacityMap.name}
          itemValue={(opacityMap) => opacityMap.id}
          value={map}
          onValueChange={setMap}
          nullable
        />
      </Field>
    </div>
  );
}
