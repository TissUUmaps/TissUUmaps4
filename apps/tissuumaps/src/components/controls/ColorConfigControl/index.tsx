import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { Input } from "@/components/ui/input";
import { useTissUUmaps } from "@/store";
import { useEffect, useState } from "react";

import { type TableData, colorPalettes } from "@tissuumaps/core";

import { ColorPicker } from "../../common/color-picker";
import { Field, FieldControl, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { useColorConfigContext } from "./context";

export { ColorConfigContextProvider } from "./ColorConfigContextProvider";
export { ColorConfigSourceToggleGroup } from "./ColorConfigSourceToggleGroup";

export type ColorConfigControlProps = {
  className?: string;
};

export function ColorConfigControl({ className }: ColorConfigControlProps) {
  const { currentSource } = useColorConfigContext();

  switch (currentSource) {
    case "constant":
      return <ConstantColorConfigControl className={className} />;
    case "from":
      return <FromColorConfigControl className={className} />;
    case "groupBy":
      return <GroupByColorConfigControl className={className} />;
    case "random":
      return <RandomColorConfigControl className={className} />;
  }
}

type ConstantColorConfigControlProps = {
  className?: string;
};

function ConstantColorConfigControl({
  className,
}: ConstantColorConfigControlProps) {
  const { currentConstantValue, setCurrentConstantValue } =
    useColorConfigContext();

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Color</FieldLabel>
        <FieldControl
          render={
            <ColorPicker
              color={currentConstantValue}
              onColorChange={setCurrentConstantValue}
            />
          }
        />
      </Field>
    </div>
  );
}

type FromColorConfigControlProps = {
  className?: string;
};

function FromColorConfigControl({ className }: FromColorConfigControlProps) {
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
              suggestQueries={async (currentQuery) => {
                if (currentFromTableData !== null) {
                  return await currentFromTableData.suggestColumnQueries(
                    currentQuery,
                  );
                }
                return Promise.resolve([]);
              }}
              getItem={async (query) => {
                if (currentFromTableData !== null) {
                  return await currentFromTableData.getColumn(query);
                }
                return Promise.resolve(null);
              }}
              itemQuery={(column) => column}
              selectedItem={currentFromColumn}
              onSelectedItemChange={setCurrentFromColumn}
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
                  event.target.value ? +event.target.value : null,
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
                  event.target.value ? +event.target.value : null,
                )
              }
            />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Color palette</FieldLabel>
        <FieldControl
          render={
            <SimpleSelect
              items={colorPalettes}
              itemLabel={(colorPalette) => colorPalette.name}
              itemValue={(colorPalette) => colorPalette.id}
              value={currentFromPalette}
              onValueChange={setCurrentFromPalette}
            />
          }
        />
      </Field>
    </div>
  );
}

type GroupByColorConfigControlProps = {
  className?: string;
};

function GroupByColorConfigControl({
  className,
}: GroupByColorConfigControlProps) {
  const {
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    currentGroupByPalette,
    setCurrentGroupByTable,
    setCurrentGroupByColumn,
    setCurrentGroupByMap,
    setCurrentGroupByPalette,
  } = useColorConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const colorMaps = useTissUUmaps((state) => state.colorMaps);
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
      <Field>
        <FieldLabel>Table</FieldLabel>
        <FieldControl
          render={
            <SimpleSelect
              items={tables}
              itemLabel={(table) => table.name}
              itemValue={(table) => table.id}
              value={currentGroupByTable}
              onValueChange={setCurrentGroupByTable}
            />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Column</FieldLabel>
        <FieldControl
          render={
            <SimpleAsyncCombobox
              suggestQueries={async (currentQuery) => {
                if (currentGroupByTableData !== null) {
                  return await currentGroupByTableData.suggestColumnQueries(
                    currentQuery,
                  );
                }
                return Promise.resolve([]);
              }}
              getItem={async (query) => {
                if (currentGroupByTableData !== null) {
                  return await currentGroupByTableData.getColumn(query);
                }
                return Promise.resolve(null);
              }}
              itemQuery={(column) => column}
              selectedItem={currentGroupByColumn}
              onSelectedItemChange={setCurrentGroupByColumn}
            />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Color map</FieldLabel>
        <FieldControl
          render={
            <SimpleSelect
              items={colorMaps}
              itemLabel={(colorMap) => colorMap.name}
              itemValue={(colorMap) => colorMap.id}
              value={currentGroupByMap}
              onValueChange={setCurrentGroupByMap}
            />
          }
        />
      </Field>
      <Field disabled={currentGroupByMap !== null}>
        <FieldLabel>Color palette</FieldLabel>
        <FieldControl
          render={
            <SimpleSelect
              items={colorPalettes}
              itemLabel={(colorPalette) => colorPalette.name}
              itemValue={(colorPalette) => colorPalette.id}
              value={currentGroupByPalette}
              onValueChange={setCurrentGroupByPalette}
            />
          }
        />
      </Field>
    </div>
  );
}

type RandomColorConfigControlProps = {
  className?: string;
};

function RandomColorConfigControl({
  className,
}: RandomColorConfigControlProps) {
  const { currentRandomPalette, setCurrentRandomPalette } =
    useColorConfigContext();

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Color palette</FieldLabel>
        <FieldControl
          render={
            <SimpleSelect
              items={colorPalettes}
              itemLabel={(colorPalette) => colorPalette.name}
              itemValue={(colorPalette) => colorPalette.id}
              value={currentRandomPalette}
              onValueChange={setCurrentRandomPalette}
            />
          }
        />
      </Field>
    </div>
  );
}
