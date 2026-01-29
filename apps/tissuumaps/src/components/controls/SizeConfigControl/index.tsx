import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTissUUmaps } from "@/store";
import { useEffect, useState } from "react";

import { type CoordinateSpace, type TableData } from "@tissuumaps/core";

import { Field, FieldControl, FieldItem, FieldLabel } from "../../common/field";
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
    currentConstantValue,
    currentConstantUnit,
    setCurrentConstantValue,
    setCurrentConstantUnit,
  } = useSizeConfigContext();

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Size</FieldLabel>
        <FieldControl
          render={
            <Input
              type="number"
              value={currentConstantValue}
              onChange={(event) =>
                setCurrentConstantValue(
                  event.target.value
                    ? +event.target.value
                    : currentConstantValue,
                )
              }
            />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Unit</FieldLabel>
        <RadioGroup
          value={currentConstantUnit}
          onValueChange={(value) =>
            setCurrentConstantUnit(value as CoordinateSpace)
          }
          className="flex gap-4"
        >
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"data" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>Data</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"layer" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>Layer</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"world" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>World</FieldLabel>
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
    currentFromTable,
    currentFromColumn,
    currentFromUnit,
    setCurrentFromTable,
    setCurrentFromColumn,
    setCurrentFromUnit,
  } = useSizeConfigContext();

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
        <FieldLabel>Unit</FieldLabel>
        <RadioGroup
          value={currentFromUnit}
          onValueChange={(value) =>
            setCurrentFromUnit(value as CoordinateSpace)
          }
          className="flex gap-4"
        >
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"data" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>Data</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"layer" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>Layer</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"world" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>World</FieldLabel>
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
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    currentGroupByUnit,
    setCurrentGroupByTable,
    setCurrentGroupByColumn,
    setCurrentGroupByMap,
    setCurrentGroupByUnit,
  } = useSizeConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const sizeMaps = useTissUUmaps((state) => state.sizeMaps);
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
        <FieldLabel>Size map</FieldLabel>
        <FieldControl
          render={
            <SimpleSelect
              items={sizeMaps}
              itemLabel={(sizeMap) => sizeMap.name}
              itemValue={(sizeMap) => sizeMap.id}
              value={currentGroupByMap}
              onValueChange={setCurrentGroupByMap}
            />
          }
        />
      </Field>
      <Field>
        <FieldLabel>Unit</FieldLabel>
        <RadioGroup
          value={currentGroupByUnit}
          onValueChange={(value) =>
            setCurrentGroupByUnit(value as CoordinateSpace)
          }
          className="flex gap-4"
        >
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"data" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>Data</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"layer" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>Layer</FieldLabel>
          </FieldItem>
          <FieldItem className="flex items-center gap-3">
            <FieldControl
              render={
                <RadioGroupItem value={"world" satisfies CoordinateSpace} />
              }
            />
            <FieldLabel>World</FieldLabel>
          </FieldItem>
        </RadioGroup>
      </Field>
    </div>
  );
}
