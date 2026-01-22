import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { Input } from "@/components/ui/input";
import { useTissUUmaps } from "@/store";
import { useEffect, useId, useState } from "react";

import { type TableData } from "@tissuumaps/core";
import { type CoordinateSpace } from "@tissuumaps/core";

import { Field, FieldControl, FieldItem, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { RadioGroup, RadioGroupItem } from "../../ui/radio-group";
import { useSizeConfigContext } from "./context";

export { SizeConfigContextProvider } from "./SizeConfigContextProvider";

export type SizeConfigControlProps = {
  defaultConstantValue: number;
  className?: string;
};

export function SizeConfigControl({
  defaultConstantValue,
  className,
}: SizeConfigControlProps) {
  const { currentSource, currentUnit, setCurrentUnit } = useSizeConfigContext();
  const dataId = useId();
  const layerId = useId();
  const worldId = useId();

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Unit</FieldLabel>
        <RadioGroup
          value={currentUnit ?? ("data" satisfies CoordinateSpace)}
          onValueChange={(value) => setCurrentUnit(value as CoordinateSpace)}
          className="flex gap-4"
        >
          <FieldItem>
            <div className="flex items-center gap-3">
              <FieldControl
                render={
                  <RadioGroupItem
                    value={"data" satisfies CoordinateSpace}
                    id={dataId}
                  />
                }
              />
              <FieldLabel htmlFor={dataId}>Data</FieldLabel>
            </div>
          </FieldItem>
          <FieldItem>
            <div className="flex items-center gap-3">
              <FieldControl
                render={
                  <RadioGroupItem
                    value={"layer" satisfies CoordinateSpace}
                    id={layerId}
                  />
                }
              />
              <FieldLabel htmlFor={layerId}>Layer</FieldLabel>
            </div>
          </FieldItem>
          <FieldItem>
            <div className="flex items-center gap-3">
              <FieldControl
                render={
                  <RadioGroupItem
                    value={"world" satisfies CoordinateSpace}
                    id={worldId}
                  />
                }
              />
              <FieldLabel htmlFor={worldId}>World</FieldLabel>
            </div>
          </FieldItem>
        </RadioGroup>
      </Field>
      {(() => {
        switch (currentSource) {
          case "constant":
            return (
              <SizeConfigValueControl
                defaultConstantValue={defaultConstantValue}
                className={className}
              />
            );
          case "from":
            return <SizeConfigFromControl className={className} />;
          case "groupBy":
            return <SizeConfigGroupByControl className={className} />;
        }
      })()}
    </div>
  );
}

type SizeConfigValueControlProps = {
  defaultConstantValue: number;
  className?: string;
};

function SizeConfigValueControl({
  defaultConstantValue,
  className,
}: SizeConfigValueControlProps) {
  const { currentConstantValue, setCurrentConstantValue } =
    useSizeConfigContext();

  return (
    <div className={className}>
      <Input
        type="number"
        value={currentConstantValue ?? defaultConstantValue}
        onChange={(event) =>
          setCurrentConstantValue(
            event.target.value ? +event.target.value : null,
          )
        }
      />
    </div>
  );
}

type SizeConfigFromControlProps = {
  className?: string;
};

function SizeConfigFromControl({ className }: SizeConfigFromControlProps) {
  const {
    currentFromTable,
    currentFromColumn,
    setCurrentFromTable,
    setCurrentFromColumn,
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
    </div>
  );
}

type SizeConfigGroupByControlProps = {
  className?: string;
};

function SizeConfigGroupByControl({
  className,
}: SizeConfigGroupByControlProps) {
  const {
    currentGroupByTable,
    currentGroupByColumn,
    setCurrentGroupByTable,
    setCurrentGroupByColumn,
  } = useSizeConfigContext();

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

export { SizeConfigSourceToggleGroup } from "./SizeConfigSourceToggleGroup";
