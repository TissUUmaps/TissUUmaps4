import { SimpleAsyncCombobox } from "@/components/common/simple-combobox";
import { Switch } from "@/components/ui/switch";
import { useTissUUmaps } from "@/store";
import { useEffect, useState } from "react";

import { type TableData } from "@tissuumaps/core";

import { Field, FieldLabel } from "../../common/field";
import { SimpleSelect } from "../../common/simple-select";
import { useVisibilityConfigContext } from "./context";

export { VisibilityConfigContextProvider } from "./VisibilityConfigContextProvider";
export { VisibilityConfigSourceToggleGroup } from "./VisibilityConfigSourceToggleGroup";

export type VisibilityConfigControlProps = {
  className?: string;
};

export function VisibilityConfigControl({
  className,
}: VisibilityConfigControlProps) {
  const { currentSource } = useVisibilityConfigContext();

  switch (currentSource) {
    case "constant":
      return <ConstantVisibilityConfigControl className={className} />;
    case "from":
      return <FromVisibilityConfigControl className={className} />;
    case "groupBy":
      return <GroupByVisibilityConfigControl className={className} />;
  }
}

type ConstantVisibilityConfigControlProps = {
  className?: string;
};

function ConstantVisibilityConfigControl({
  className,
}: ConstantVisibilityConfigControlProps) {
  const { currentConstantValue: value, setCurrentConstantValue: setValue } =
    useVisibilityConfigContext();

  return (
    <div className={className}>
      <Field>
        <FieldLabel>Visibility</FieldLabel>
        <div className="flex flex-row items-center gap-x-2">
          <Switch checked={value} onCheckedChange={setValue} />
          {value ? "Visible" : "Hidden"}
        </div>
      </Field>
    </div>
  );
}

type FromVisibilityConfigControlProps = {
  className?: string;
};

function FromVisibilityConfigControl({
  className,
}: FromVisibilityConfigControlProps) {
  const {
    currentFromTable: table,
    currentFromColumn: column,
    setCurrentFromTable: setTable,
    setCurrentFromColumn: setColumn,
  } = useVisibilityConfigContext();

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

type GroupByVisibilityConfigControlProps = {
  className?: string;
};

function GroupByVisibilityConfigControl({
  className,
}: GroupByVisibilityConfigControlProps) {
  const {
    currentGroupByTable: table,
    currentGroupByColumn: column,
    currentGroupByMap: map,
    setCurrentGroupByTable: setTable,
    setCurrentGroupByColumn: setColumn,
    setCurrentGroupByMap: setMap,
  } = useVisibilityConfigContext();

  const tables = useTissUUmaps((state) => state.tables);
  const visibilityMaps = useTissUUmaps((state) => state.visibilityMaps);
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
        <FieldLabel>Visibility map</FieldLabel>
        <SimpleSelect
          items={visibilityMaps}
          itemLabel={(visibilityMap) => visibilityMap.name}
          itemValue={(visibilityMap) => visibilityMap.id}
          value={map}
          onValueChange={setMap}
        />
      </Field>
    </div>
  );
}
