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
  const tableDataLoaderRegistry = useTissUUmaps(
    (state) => state.tableDataLoaderRegistry,
  );

  const { dataSourceSchema, dataSourceUISchema } = useMemo(() => {
    const value = tableDataLoaderRegistry.get(table.dataSource.type);
    if (value === undefined) {
      throw new Error(
        `No table data loader registered for data source type "${table.dataSource.type}"`,
      );
    }
    return value;
  }, [tableDataLoaderRegistry, table.dataSource.type]);

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
