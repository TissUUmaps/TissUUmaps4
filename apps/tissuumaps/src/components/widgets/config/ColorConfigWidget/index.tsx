import { Square } from "lucide-react";

import { MathUtils, colorPalettes } from "@tissuumaps/core";

import { Input } from "@/components/ui/input";

import { useTableColumnSelector } from "../../../../hooks/useTableColumnSelector";
import { useTissUUmaps } from "../../../../store";
import { Field, FieldLabel } from "../../../common/field";
import { SimpleColorPicker } from "../../../common/simple-color-picker";
import { SimpleAsyncCombobox } from "../../../common/simple-combobox";
import { SimpleSelect } from "../../../common/simple-select";
import { type ColorConfigWidgetState } from "./useColorConfigWidget";

export { ActiveColorConfigValue } from "./ActiveColorConfigValue";
export { ColorConfigSourceToggleGroup } from "./ColorConfigSourceToggleGroup";

export type ColorConfigWidgetProps = {
  state: ColorConfigWidgetState;
  className?: string;
};

export function ColorConfigWidget({
  state,
  className,
}: ColorConfigWidgetProps) {
  switch (state.currentSource) {
    case "constant":
      return <ConstantColorConfigWidget state={state} className={className} />;
    case "from":
      return <FromColorConfigWidget state={state} className={className} />;
    case "groupBy":
      return <GroupByColorConfigWidget state={state} className={className} />;
    case "random":
      return <RandomColorConfigWidget state={state} className={className} />;
  }
}

type ConstantColorConfigWidgetProps = {
  state: ColorConfigWidgetState;
  className?: string;
};

function ConstantColorConfigWidget({
  state,
  className,
}: ConstantColorConfigWidgetProps) {
  const { currentConstantValue: color, setCurrentConstantValue: setColor } =
    state;

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
              if (event.target.value !== "") {
                setColor({
                  ...color,
                  r: MathUtils.clamp(parseInt(event.target.value), 0, 255),
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
              if (event.target.value !== "") {
                setColor({
                  ...color,
                  g: MathUtils.clamp(parseInt(event.target.value), 0, 255),
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
              if (event.target.value !== "") {
                setColor({
                  ...color,
                  b: MathUtils.clamp(parseInt(event.target.value), 0, 255),
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
  state: ColorConfigWidgetState;
  className?: string;
};

function FromColorConfigWidget({
  state,
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
            onChange={(event) =>
              setRangeMin(
                event.target.value !== ""
                  ? parseFloat(event.target.value)
                  : null,
              )
            }
          />
        </Field>
        <Field>
          <FieldLabel>Max. value</FieldLabel>
          <Input
            type="number"
            inputMode="decimal"
            value={rangeMax ?? ""}
            onChange={(event) =>
              setRangeMax(
                event.target.value !== ""
                  ? parseFloat(event.target.value)
                  : null,
              )
            }
          />
        </Field>
      </div>
    </div>
  );
}

type GroupByColorConfigWidgetProps = {
  state: ColorConfigWidgetState;
  className?: string;
};

function GroupByColorConfigWidget({
  state,
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
  } = state;

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
  state: ColorConfigWidgetState;
  className?: string;
};

function RandomColorConfigWidget({
  state,
  className,
}: RandomColorConfigWidgetProps) {
  const { currentRandomPalette: palette, setCurrentRandomPalette: setPalette } =
    state;
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
