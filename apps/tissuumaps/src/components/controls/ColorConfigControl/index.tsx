import { Input } from "@/components/ui/input";
import { useTissUUmaps } from "@/store";

import { type Color, colorPalettes } from "@tissuumaps/core";

import { ColorPicker } from "../../common/color-picker";
import { Field, FieldControl, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { useColorConfigContext } from "./context";

export { ColorConfigContextProvider } from "./ColorConfigContextProvider";

export type ColorConfigControlProps = {
  defaultValue: Color;
  className?: string;
};

export function ColorConfigControl({
  defaultValue,
  className,
}: ColorConfigControlProps) {
  const { currentSource } = useColorConfigContext();

  switch (currentSource) {
    case "value":
      return (
        <ColorConfigValueControl
          defaultValue={defaultValue}
          className={className}
        />
      );
    case "from":
      return <ColorConfigFromControl className={className} />;
    case "groupBy":
      return <ColorConfigGroupByControl className={className} />;
    case "random":
      return <ColorConfigRandomControl className={className} />;
  }
}

type ColorConfigValueControlProps = {
  defaultValue: Color;
  className?: string;
};

function ColorConfigValueControl({
  defaultValue,
  className,
}: ColorConfigValueControlProps) {
  const { currentValue, setCurrentValue } = useColorConfigContext();

  return (
    <div className={className}>
      <ColorPicker
        color={currentValue ?? defaultValue}
        onColorChange={setCurrentValue}
      />
    </div>
  );
}

type ColorConfigFromControlProps = {
  className?: string;
};

function ColorConfigFromControl({ className }: ColorConfigFromControlProps) {
  const {
    currentFromTable,
    currentFromRangeMin,
    currentFromRangeMax,
    currentFromPalette,
    setCurrentFromTable,
    setCurrentFromRangeMin,
    setCurrentFromRangeMax,
    setCurrentFromPalette,
  } = useColorConfigContext();

  const tables = useTissUUmaps((state) => state.tables);

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Table</FieldLabel>
        <FieldControl
          render={
            <SimpleSelect
              items={tables}
              itemLabel={(table) => table.name}
              itemValue={(table) => table.id}
              value={currentFromTable}
              onValueChange={setCurrentFromTable}
            />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Column</FieldLabel>
        {/* TODO column combobox */}
        <FieldControl />
      </Field>
      <Field>
        <FieldLabel>Min</FieldLabel>
        <FieldControl
          render={
            <Input
              type="number"
              value={currentFromRangeMin ?? ""}
              onChange={(event) =>
                setCurrentFromRangeMin(
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Max</FieldLabel>
        <FieldControl
          render={
            <Input
              type="number"
              value={currentFromRangeMax ?? ""}
              onChange={(event) =>
                setCurrentFromRangeMax(
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Palette</FieldLabel>
        <FieldControl
          render={
            <SimpleSelect
              items={Object.entries(colorPalettes)}
              itemLabel={([paletteId]) => paletteId}
              itemValue={([paletteId]) => paletteId}
              value={currentFromPalette}
              onValueChange={setCurrentFromPalette}
            />
          }
        />
      </Field>
    </div>
  );
}

type ColorConfigGroupByControlProps = {
  className?: string;
};

function ColorConfigGroupByControl({
  className,
}: ColorConfigGroupByControlProps) {
  const { currentGroupByTable, setCurrentGroupByTable } =
    useColorConfigContext();

  const tables = useTissUUmaps((state) => state.tables);

  return (
    <div className={className}>
      <SimpleSelect
        items={tables}
        itemLabel={(table) => table.name}
        itemValue={(table) => table.id}
        value={currentGroupByTable}
        onValueChange={setCurrentGroupByTable}
      />
      {/* TODO column combobox */}
      {/* TODO projectMap/map select */}
    </div>
  );
}

type ColorConfigRandomControlProps = {
  className?: string;
};

function ColorConfigRandomControl({
  className,
}: ColorConfigRandomControlProps) {
  const { currentRandomPalette, setCurrentRandomPalette } =
    useColorConfigContext();

  return (
    <div className={className}>
      <SimpleSelect
        items={Object.entries(colorPalettes)}
        itemLabel={([paletteId]) => paletteId}
        itemValue={([paletteId]) => paletteId}
        value={currentRandomPalette}
        onValueChange={setCurrentRandomPalette}
      />
    </div>
  );
}

export { ColorConfigSourceToggleGroup } from "./ColorConfigSourceToggleGroup";
