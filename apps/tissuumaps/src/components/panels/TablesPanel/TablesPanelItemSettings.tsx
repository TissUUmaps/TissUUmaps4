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
        schema={tableDataLoader.dataSourceSchema}
        uischema={tableDataLoader.dataSourceUISchema}
        data={table.dataSource}
        renderers={renderers}
        cells={cells}
        readonly={true}
      />
    </div>
  );
}
