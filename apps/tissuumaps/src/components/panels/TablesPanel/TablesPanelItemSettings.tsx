import { JsonForms } from "@jsonforms/react";
import { useMemo } from "react";

import { type Table } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { cells, renderers } from "../../jsonforms";

export type TablesPanelItemSettingsProps = {
  table: Table;
};

export function TablesPanelItemSettings({
  table,
}: TablesPanelItemSettingsProps) {
  const tableDataStorageRegistry = useTissUUmaps(
    (state) => state.tableDataStorageRegistry,
  );

  const { dataSourceSchema, dataSourceUISchema } = useMemo(() => {
    const value = tableDataStorageRegistry.get(table.dataSource.type);
    if (value === undefined) {
      throw new Error(
        `No table data storage adapter registered for data source type "${table.dataSource.type}"`,
      );
    }
    return value;
  }, [tableDataStorageRegistry, table.dataSource.type]);

  return (
    <div>
      {/* Data source */}
      <JsonForms
        schema={dataSourceSchema}
        uischema={dataSourceUISchema}
        data={table.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </div>
  );
}
