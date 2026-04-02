import { type CoordinateSpace } from "@tissuumaps/core";

import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

import { useTableColumnSelector } from "../../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../../store";
import { Field, FieldItem, FieldLabel } from "../../../common/field";
import { SimpleAsyncCombobox } from "../../../common/simple-combobox";
import { SimpleSelect } from "../../../common/simple-select";
import { type SizeConfigWidgetState } from "./useSizeConfigWidget";

export { ActiveSizeConfigValue } from "./ActiveSizeConfigValue";
export { SizeConfigSourceToggleGroup } from "./SizeConfigSourceToggleGroup";

export type SizeConfigWidgetProps = {
  state: SizeConfigWidgetState;
  className?: string;
};

export function SizeConfigWidget({ state, className }: SizeConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return <ConstantSizeConfigWidget state={state} className={className} />;
    case "from":
      return <FromSizeConfigWidget state={state} className={className} />;
    case "groupBy":
      return <GroupBySizeConfigWidget state={state} className={className} />;
  }
}

type ConstantSizeConfigWidgetProps = {
  state: SizeConfigWidgetState;
  className?: string;
};

function ConstantSizeConfigWidget({
  state,
  className,
}: ConstantSizeConfigWidgetProps) {
  const {
    currentConstantValue: value,
    currentConstantUnit: unit,
    setCurrentConstantValue: setValue,
    setCurrentConstantUnit: setUnit,
  } = state;

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
            if (event.target.value !== "") {
              setValue(Math.max(0, parseFloat(event.target.value)));
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
  state: SizeConfigWidgetState;
  className?: string;
};

function FromSizeConfigWidget({ state, className }: FromSizeConfigWidgetProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    currentFromUnit: unit,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
    setCurrentFromUnit: setUnit,
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
  state: SizeConfigWidgetState;
  className?: string;
};

function GroupBySizeConfigWidget({
  state,
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
  } = state;

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
