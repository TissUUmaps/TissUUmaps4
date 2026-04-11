import { type CoordinateSpace } from "@tissuumaps/core";

import { Field, FieldItem, FieldLabel } from "@/components/common/field";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { SimpleSelect } from "@/components/common/simple-select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
import { useTissUUmaps } from "@/store";

import { type SizeConfigWidgetAdapter } from "./adapter";

export { ActiveSizeConfigValue } from "./ActiveSizeConfigValue";
export { SizeConfigSourceToggleGroup } from "./SizeConfigSourceToggleGroup";

export type SizeConfigWidgetProps = {
  adapter: SizeConfigWidgetAdapter;
  className?: string;
};

export function SizeConfigWidget({
  adapter,
  className,
}: SizeConfigWidgetProps) {
  switch (adapter.currentSource) {
    case "constant":
      return (
        <ConstantSizeConfigWidget adapter={adapter} className={className} />
      );
    case "from":
      return <FromSizeConfigWidget adapter={adapter} className={className} />;
    case "groupBy":
      return (
        <GroupBySizeConfigWidget adapter={adapter} className={className} />
      );
  }
}

type ConstantSizeConfigWidgetProps = {
  adapter: SizeConfigWidgetAdapter;
  className?: string;
};

function ConstantSizeConfigWidget({
  adapter,
  className,
}: ConstantSizeConfigWidgetProps) {
  const {
    currentConstantValue: value,
    currentConstantUnit: unit,
    setCurrentConstantValue: setValue,
    setCurrentConstantUnit: setUnit,
  } = adapter;

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Size</FieldLabel>
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          value={value}
          onChange={(event) => {
            const value = event.target.valueAsNumber;
            if (!isNaN(value)) {
              setValue(Math.max(0, value));
            }
          }}
        />
      </Field>
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

type FromSizeConfigWidgetProps = {
  adapter: SizeConfigWidgetAdapter;
  className?: string;
};

function FromSizeConfigWidget({
  adapter,
  className,
}: FromSizeConfigWidgetProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    currentFromUnit: unit,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
    setCurrentFromUnit: setUnit,
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

type GroupBySizeConfigWidgetProps = {
  adapter: SizeConfigWidgetAdapter;
  className?: string;
};

function GroupBySizeConfigWidget({
  adapter,
  className,
}: GroupBySizeConfigWidgetProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    currentGroupByUnit: unit,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
    setCurrentGroupByUnit: setUnit,
  } = adapter;

  const tables = useTissUUmaps((state) => state.tables);
  const sizeMaps = useTissUUmaps((state) => state.sizeMaps);

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
        <FieldLabel>Size map</FieldLabel>
        <SimpleSelect
          items={sizeMaps}
          itemLabel={(sizeMap) => sizeMap.name}
          itemValue={(sizeMap) => sizeMap.id}
          value={map}
          onValueChange={setMap}
        />
      </Field>
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
