import { JsonForms } from "@jsonforms/react";
import { useMemo } from "react";

import { type Table, type TableDataSource } from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { cells, renderers } from "../../jsonforms";

export function TablesPanelItemSettings({ table }: { table: Table }) {
  const updateTable = useTissUUmaps((state) => state.updateTable);
  const createTableDataLoader = useTissUUmaps(
    (state) => state.createTableDataLoader,
  );

  const tableDataLoader = useMemo(
    () => createTableDataLoader(table.id),
    [createTableDataLoader, table.id],
  );

  return (
    <div>
      {/* Data source */}
      <JsonForms
        schema={tableDataLoader.schema}
        uischema={tableDataLoader.uischema}
        data={table.dataSource}
        onChange={({ data, errors }) => {
          if (errors === undefined || errors.length === 0) {
            updateTable(table.id, {
              dataSource: {
                ...table.dataSource,
                ...(data as TableDataSource),
              },
            });
          }
        }}
        renderers={renderers}
        cells={cells}
      />
    </div>
  );
}
