import { Input } from "@/components/ui/input";
import { useTissUUmaps } from "@/store";

import { type Color, colorPalettes } from "@tissuumaps/core";

import { ColorPicker } from "../../common/color-picker";
import { Field, FieldControl, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { useColorConfigContext } from "./context";

export { ColorConfigContextProvider } from "./ColorConfigContextProvider";

export function ColorConfigControl({
  defaultValue,
  className,
}: {
  defaultValue: Color;
  className?: string;
}) {
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
      return <ColorConfigRandomControl />;
  }
}

function ColorConfigValueControl({
  defaultValue,
  className,
}: {
  defaultValue: Color;
  className?: string;
}) {
  const { currentValue, setCurrentValue } = useColorConfigContext();

  return (
    <ColorPicker
      color={currentValue ?? defaultValue}
      onColorChange={setCurrentValue}
      className={className}
    />
  );
}

function ColorConfigFromControl({ className }: { className?: string }) {
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
      <SimpleSelect
        items={tables}
        itemLabel={(table) => table.name}
        itemValue={(table) => table.id}
        value={currentFromTable}
        onValueChange={setCurrentFromTable}
      />
      {/* TODO column combobox */}
      <div className="grid grid-cols-2">
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
      </div>
      <SimpleSelect
        items={Object.entries(colorPalettes)}
        itemLabel={([paletteId]) => paletteId}
        itemValue={([paletteId]) => paletteId}
        value={currentFromPalette}
        onValueChange={setCurrentFromPalette}
      />
    </div>
  );
}

function ColorConfigGroupByControl({ className }: { className?: string }) {
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

function ColorConfigRandomControl({ className }: { className?: string }) {
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
