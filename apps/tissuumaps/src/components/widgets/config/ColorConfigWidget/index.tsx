import { Square } from "lucide-react";

import { MathUtils, colorPalettes } from "@tissuumaps/core";

import { Field, FieldLabel } from "@/components/common/field";
import { SimpleColorPicker } from "@/components/common/simple-color-picker";
import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { SimpleSelect } from "@/components/common/simple-select";
import { Input } from "@/components/ui/input";
import { useTableColumnSelector } from "@/hooks/useTableColumnSelector";
import { useTissUUmaps } from "@/store";

import type { ColorConfigWidgetAdapter } from "./adapter";

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
              const newValue = event.target.valueAsNumber;
              if (!isNaN(newValue)) {
                setColor({
                  ...color,
                  r: MathUtils.clamp(Math.trunc(newValue), 0, 255),
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
              const newValue = event.target.valueAsNumber;
              if (!isNaN(newValue)) {
                setColor({
                  ...color,
                  g: MathUtils.clamp(Math.trunc(newValue), 0, 255),
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
              const newValue = event.target.valueAsNumber;
              if (!isNaN(newValue)) {
                setColor({
                  ...color,
                  b: MathUtils.clamp(Math.trunc(newValue), 0, 255),
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
    tableId,
    currentFromColumn: column,
    currentFromRangeMin: rangeMin,
    currentFromRangeMax: rangeMax,
    currentFromPalette: palette,
    setCurrentFromColumn: setColumn,
    setCurrentFromRangeMin: setRangeMin,
    setCurrentFromRangeMax: setRangeMax,
    setCurrentFromPalette: setPalette,
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
      <Field>
        <FieldLabel>Color palette</FieldLabel>
        <SimpleSelect
          items={colorPalettes}
          itemLabel={(colorPalette) => colorPalette.name}
          itemValue={(colorPalette) => colorPalette.id}
          value={palette}
          onValueChange={setPalette}
          nullable
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
              if (event.target.value === "") {
                setRangeMin(null);
              } else {
                const newValue = event.target.valueAsNumber;
                if (!isNaN(newValue)) {
                  setRangeMin(newValue);
                }
              }
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
              if (event.target.value === "") {
                setRangeMax(null);
              } else {
                const newValue = event.target.valueAsNumber;
                if (!isNaN(newValue)) {
                  setRangeMax(newValue);
                }
              }
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
    tableId,
    currentGroupByColumn: column,
    currentGroupByPalette: palette,
    currentGroupByMap: map,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByPalette: setPalette,
    setCurrentGroupByMap: setMap,
  } = adapter;

  const colorMaps = useTissUUmaps((state) => state.colorMaps);

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
      <Field disabled={map !== null}>
        <FieldLabel>Color palette</FieldLabel>
        <SimpleSelect
          items={colorPalettes}
          itemLabel={(colorPalette) => colorPalette.name}
          itemValue={(colorPalette) => colorPalette.id}
          value={palette}
          onValueChange={setPalette}
          nullable
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
          nullable
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
          nullable
        />
      </Field>
    </div>
  );
}
