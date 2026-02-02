import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTissUUmaps } from "@/store";
import { useEffect, useState } from "react";

import { type CoordinateSpace, type TableData } from "@tissuumaps/core";

import { Field, FieldItem, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { useSizeConfigContext } from "./context";

export { SizeConfigContextProvider } from "./SizeConfigContextProvider";
export { SizeConfigSourceToggleGroup } from "./SizeConfigSourceToggleGroup";

export type SizeConfigControlProps = {
  className?: string;
};

export function SizeConfigControl({ className }: SizeConfigControlProps) {
  const { currentSource } = useSizeConfigContext();

  switch (currentSource) {
    case "constant":
      return <ConstantSizeConfigControl className={className} />;
    case "from":
      return <FromSizeConfigControl className={className} />;
    case "groupBy":
      return <GroupBySizeConfigControl className={className} />;
  }
}

type ConstantSizeConfigControlProps = {
  className?: string;
};

function ConstantSizeConfigControl({
  className,
}: ConstantSizeConfigControlProps) {
  const {
    currentConstantValue: value,
    currentConstantUnit: unit,
    setCurrentConstantValue: setValue,
    setCurrentConstantUnit: setUnit,
  } = useSizeConfigContext();

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Size</FieldLabel>
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(event) => setValue(Math.max(0, +event.target.value))}
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
            <FieldLabel>Data pixels</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"layer" satisfies CoordinateSpace} />
            <FieldLabel>Layer pixels</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"world" satisfies CoordinateSpace} />
            <FieldLabel>World pixels</FieldLabel>
          </FieldItem>
        </RadioGroup>
      </Field>
    </div>
  );
}

type FromSizeConfigControlProps = {
  className?: string;
};

function FromSizeConfigControl({ className }: FromSizeConfigControlProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    currentFromUnit: unit,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
    setCurrentFromUnit: setUnit,
  } = useSizeConfigContext();

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
        <FieldLabel>Size unit</FieldLabel>
        <RadioGroup
          value={unit}
          onValueChange={(value) => setUnit(value as CoordinateSpace)}
          className="flex gap-x-4"
        >
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"data" satisfies CoordinateSpace} />
            <FieldLabel>Data pixels</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"layer" satisfies CoordinateSpace} />
            <FieldLabel>Layer pixels</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"world" satisfies CoordinateSpace} />
            <FieldLabel>World pixels</FieldLabel>
          </FieldItem>
        </RadioGroup>
      </Field>
    </div>
  );
}

type GroupBySizeConfigControlProps = {
  className?: string;
};

function GroupBySizeConfigControl({
  className,
}: GroupBySizeConfigControlProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    currentGroupByUnit: unit,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
    setCurrentGroupByUnit: setUnit,
  } = useSizeConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const sizeMaps = useTissUUmaps((state) => state.sizeMaps);
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
            <FieldLabel>Data pixels</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"layer" satisfies CoordinateSpace} />
            <FieldLabel>Layer pixels</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-x-2">
            <RadioGroupItem value={"world" satisfies CoordinateSpace} />
            <FieldLabel>World pixels</FieldLabel>
          </FieldItem>
        </RadioGroup>
      </Field>
    </div>
  );
}
