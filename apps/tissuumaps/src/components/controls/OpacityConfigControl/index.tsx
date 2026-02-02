import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { Input } from "@/components/ui/input";
import { useTissUUmaps } from "@/store";
import { useEffect, useState } from "react";

import { type TableData } from "@tissuumaps/core";

import { Field, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { useOpacityConfigContext } from "./context";

export { OpacityConfigContextProvider } from "./OpacityConfigContextProvider";
export { OpacityConfigSourceToggleGroup } from "./OpacityConfigSourceToggleGroup";

export type OpacityConfigControlProps = {
  className?: string;
};

export function OpacityConfigControl({ className }: OpacityConfigControlProps) {
  const { currentSource } = useOpacityConfigContext();

  switch (currentSource) {
    case "constant":
      return <ConstantOpacityConfigControl className={className} />;
    case "from":
      return <FromOpacityConfigControl className={className} />;
    case "groupBy":
      return <GroupByOpacityConfigControl className={className} />;
  }
}

type ConstantOpacityConfigControlProps = {
  className?: string;
};

function ConstantOpacityConfigControl({
  className,
}: ConstantOpacityConfigControlProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    useOpacityConfigContext();

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Opacity</FieldLabel>
        <Input
          type="number"
          min={0}
          max={1}
          step={0.01}
          value={value}
          onChange={(event) => {
            const opacity = event.target.valueAsNumber;
            if (Number.isFinite(opacity)) {
              setValue(Math.min(Math.max(0, opacity), 1));
            }
          }}
        />
      </Field>
    </div>
  );
}

type FromOpacityConfigControlProps = {
  className?: string;
};

function FromOpacityConfigControl({
  className,
}: FromOpacityConfigControlProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
  } = useOpacityConfigContext();

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
    </div>
  );
}

type GroupByOpacityConfigControlProps = {
  className?: string;
};

function GroupByOpacityConfigControl({
  className,
}: GroupByOpacityConfigControlProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = useOpacityConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const opacityMaps = useTissUUmaps((state) => state.opacityMaps);
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
        <FieldLabel>Opacity map</FieldLabel>
        <SimpleSelect
          items={opacityMaps}
          itemLabel={(opacityMap) => opacityMap.name}
          itemValue={(opacityMap) => opacityMap.id}
          value={map}
          onValueChange={setMap}
        />
      </Field>
    </div>
  );
}
