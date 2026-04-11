import { Square } from "lucide-react";

import { MathUtils, colorPalettes } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { SimpleColorPicker } from "@/components/common/simple-color-picker";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { SimpleSelect } from "@/components/common/simple-select";
import { Input } from "@/components/ui/input";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
import { useTissUUmaps } from "@/store";

import { type ColorConfigWidgetAdapter } from "./adapter";

export { ActiveColorConfigValue } from "./ActiveColorConfigValue";
export { ColorConfigSourceToggleGroup } from "./ColorConfigSourceToggleGroup";

export type ColorConfigWidgetProps = {
  adapter: ColorConfigWidgetAdapter;
  className?: string;
};

export function ColorConfigWidget({
  adapter,
  className,
}: ColorConfigWidgetProps) {
  switch (adapter.currentSource) {
    case "constant":
      return (
        <ConstantColorConfigWidget adapter={adapter} className={className} />
      );
    case "from":
      return <FromColorConfigWidget adapter={adapter} className={className} />;
    case "groupBy":
      return (
        <GroupByColorConfigWidget adapter={adapter} className={className} />
      );
    case "random":
      return (
        <RandomColorConfigWidget adapter={adapter} className={className} />
      );
  }
}

type ConstantColorConfigWidgetProps = {
  adapter: ColorConfigWidgetAdapter;
  className?: string;
};

function ConstantColorConfigWidget({
  adapter,
  className,
}: ConstantColorConfigWidgetProps) {
  const { currentConstantValue: color, setCurrentConstantValue: setColor } =
    adapter;

  return (
    <div className={className}>
      <div className="grid grid-cols-4 grid-flow-col gap-x-2 items-center">
        <Field className="contents">
          <FieldLabel>Red</FieldLabel>
          <Input
            type="number"
            min={0}
            max={255}
            value={color.r}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (!isNaN(value)) {
                setColor({
                  ...color,
                  r: MathUtils.clamp(Math.trunc(value), 0, 255),
                });
              }
            }}
          />
        </Field>
        <Field className="contents">
          <FieldLabel>Green</FieldLabel>
          <Input
            type="number"
            min={0}
            max={255}
            value={color.g}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (!isNaN(value)) {
                setColor({
                  ...color,
                  g: MathUtils.clamp(Math.trunc(value), 0, 255),
                });
              }
            }}
          />
        </Field>
        <Field className="contents">
          <FieldLabel>Blue</FieldLabel>
          <Input
            type="number"
            min={0}
            max={255}
            value={color.b}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              if (!isNaN(value)) {
                setColor({
                  ...color,
                  b: MathUtils.clamp(Math.trunc(value), 0, 255),
                });
              }
            }}
          />
        </Field>
        <SimpleColorPicker
          color={color}
          onColorChange={setColor}
          className="row-start-2 col-start-4"
        >
          <Square fill={`rgb(${color.r}, ${color.g}, ${color.b})`} /> Pick
        </SimpleColorPicker>
      </div>
    </div>
  );
}

type FromColorConfigWidgetProps = {
  adapter: ColorConfigWidgetAdapter;
  className?: string;
};

function FromColorConfigWidget({
  adapter,
  className,
}: FromColorConfigWidgetProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    currentFromRangeMin: rangeMin,
    currentFromRangeMax: rangeMax,
    currentFromPalette: palette,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
    setCurrentFromRangeMin: setRangeMin,
    setCurrentFromRangeMax: setRangeMax,
    setCurrentFromPalette: setPalette,
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
        <FieldLabel>Color palette</FieldLabel>
        <SimpleSelect
          items={colorPalettes}
          itemLabel={(colorPalette) => colorPalette.name}
          itemValue={(colorPalette) => colorPalette.id}
          value={palette}
          onValueChange={setPalette}
        />
      </Field>
      <div className="grid grid-cols-2 gap-x-2">
        <Field>
          <FieldLabel>Min. value</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            value={rangeMin ?? ""}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              setRangeMin(!isNaN(value) ? value : null);
            }}
          />
        </Field>
        <Field>
          <FieldLabel>Max. value</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            value={rangeMax ?? ""}
            onChange={(event) => {
              const value = event.target.valueAsNumber;
              setRangeMax(!isNaN(value) ? value : null);
            }}
          />
        </Field>
      </div>
    </div>
  );
}

type GroupByColorConfigWidgetProps = {
  adapter: ColorConfigWidgetAdapter;
  className?: string;
};

function GroupByColorConfigWidget({
  adapter,
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
  } = adapter;

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

type RandomColorConfigWidgetProps = {
  adapter: ColorConfigWidgetAdapter;
  className?: string;
};

function RandomColorConfigWidget({
  adapter,
  className,
}: RandomColorConfigWidgetProps) {
  const { currentRandomPalette: palette, setCurrentRandomPalette: setPalette } =
    adapter;
  return (
    <div className={className}>
      <Field>
        <FieldLabel>Color palette</FieldLabel>
        <SimpleSelect
          items={colorPalettes}
          itemLabel={(colorPalette) => colorPalette.name}
          itemValue={(colorPalette) => colorPalette.id}
          value={palette}
          onValueChange={setPalette}
        />
      </Field>
    </div>
  );
}
