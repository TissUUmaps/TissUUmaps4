import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { Input } from "@/components/ui/input";
import { useTissUUmaps } from "@/store";
import { Square } from "lucide-react";
import { useEffect, useState } from "react";

import { type TableData, colorPalettes } from "@tissuumaps/core";

import { Field, FieldLabel } from "../../common/field";
import { SimpleColorPicker } from "../../common/simple-color-picker";
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
  const { currentConstantValue: color, setCurrentConstantValue: setColor } =
    useColorConfigContext();

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
              const r = event.target.valueAsNumber;
              if (Number.isFinite(r)) {
                setColor({
                  ...color,
                  r: Math.min(Math.max(0, r), 255),
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
              const g = event.target.valueAsNumber;
              if (Number.isFinite(g)) {
                setColor({
                  ...color,
                  g: Math.min(Math.max(0, g), 255),
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
              const b = event.target.valueAsNumber;
              if (Number.isFinite(b)) {
                setColor({
                  ...color,
                  b: Math.min(Math.max(0, b), 255),
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

type FromColorConfigControlProps = {
  className?: string;
};

function FromColorConfigControl({ className }: FromColorConfigControlProps) {
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
  } = useColorConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const [tableData, setTableData] = useState<TableData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    async function loadTableData() {
      if (table) {
        const tableData = await loadTable(table, {
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setTableData(tableData);
        }
      }
    }
    loadTableData().catch(console.error);
    return () => {
      abortController.abort();
    };
  }, [table, loadTable]);

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
            suggestQueries={async (currentQuery) => {
              if (tableData !== null) {
                return await tableData.suggestColumnQueries(currentQuery);
              }
              return Promise.resolve([]);
            }}
            getItem={async (query) => {
              if (tableData !== null) {
                return await tableData.getColumn(query);
              }
              return Promise.resolve(null);
            }}
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
            value={rangeMin ?? ""}
            onChange={(event) =>
              setRangeMin(event.target.value ? +event.target.value : null)
            }
          />
        </Field>
        <Field>
          <FieldLabel>Max. value</FieldLabel>
          <Input
            type="number"
            value={rangeMax ?? ""}
            onChange={(event) =>
              setRangeMax(event.target.value ? +event.target.value : null)
            }
          />
        </Field>
      </div>
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
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByPalette: palette,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByPalette: setPalette,
    setCurrentGroupByMap: setMap,
  } = useColorConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const colorMaps = useTissUUmaps((state) => state.colorMaps);
  const loadTable = useTissUUmaps((state) => state.loadTable);

  const [tableData, setTableData] = useState<TableData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();
    async function loadTableData() {
      if (table) {
        const tableData = await loadTable(table, {
          signal: abortController.signal,
        });
        if (!abortController.signal.aborted) {
          setTableData(tableData);
        }
      }
    }
    loadTableData().catch(console.error);
    return () => {
      abortController.abort();
    };
  }, [table, loadTable]);

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
            suggestQueries={async (currentQuery) => {
              if (tableData !== null) {
                return await tableData.suggestColumnQueries(currentQuery);
              }
              return Promise.resolve([]);
            }}
            getItem={async (query) => {
              if (tableData !== null) {
                return await tableData.getColumn(query);
              }
              return Promise.resolve(null);
            }}
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

type RandomColorConfigControlProps = {
  className?: string;
};

function RandomColorConfigControl({
  className,
}: RandomColorConfigControlProps) {
  const { currentRandomPalette: palette, setCurrentRandomPalette: setPalette } =
    useColorConfigContext();

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
