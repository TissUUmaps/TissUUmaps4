import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { Input } from "@/components/ui/input";
import { useTissUUmaps } from "@/store";
import { useEffect, useState } from "react";

import { type Color, type TableData, colorPalettes } from "@tissuumaps/core";

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
    currentFromColumn,
    currentFromRangeMin,
    currentFromRangeMax,
    currentFromPalette,
    setCurrentFromTable,
    setCurrentFromColumn,
    setCurrentFromRangeMin,
    setCurrentFromRangeMax,
    setCurrentFromPalette,
  } = useColorConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const [currentFromTableData, setCurrentFromTableData] =
    useState<TableData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadCurrentFromTableData() {
      if (currentFromTable) {
        const tableData = await loadTable(currentFromTable, {
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setCurrentFromTableData(tableData);
        }
      }
    }

    loadCurrentFromTableData().catch(console.error);

    return () => {
      abortController.abort();
    };
  }, [currentFromTable, loadTable]);

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
        <FieldControl
          render={
            <SimpleAsyncCombobox
              item={currentFromColumn}
              onItemChange={setCurrentFromColumn}
              getItem={currentFromTableData?.getColumn.bind(
                currentFromTableData,
              )}
              suggestQueries={currentFromTableData?.suggestColumnQueries.bind(
                currentFromTableData,
              )}
            />
          }
        />
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
                  event.target.value ? +event.target.value : undefined,
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
                  event.target.value ? +event.target.value : undefined,
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
  const {
    currentGroupByTable,
    currentGroupByColumn,
    setCurrentGroupByTable,
    setCurrentGroupByColumn,
  } = useColorConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const [currentGroupByTableData, setCurrentGroupByTableData] =
    useState<TableData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadCurrentGroupByTableData() {
      if (currentGroupByTable) {
        const tableData = await loadTable(currentGroupByTable, {
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setCurrentGroupByTableData(tableData);
        }
      }
    }

    loadCurrentGroupByTableData().catch(console.error);

    return () => {
      abortController.abort();
    };
  }, [currentGroupByTable, loadTable]);

  return (
    <div className={className}>
      <SimpleSelect
        items={tables}
        itemLabel={(table) => table.name}
        itemValue={(table) => table.id}
        value={currentGroupByTable}
        onValueChange={setCurrentGroupByTable}
      />
      <FieldControl
        render={
          <SimpleAsyncCombobox
            item={currentGroupByColumn}
            onItemChange={setCurrentGroupByColumn}
            getItem={currentGroupByTableData?.getColumn.bind(
              currentGroupByTableData,
            )}
            suggestQueries={currentGroupByTableData?.suggestColumnQueries.bind(
              currentGroupByTableData,
            )}
          />
        }
      />
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
