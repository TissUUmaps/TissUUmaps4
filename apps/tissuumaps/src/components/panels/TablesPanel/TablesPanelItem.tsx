import { type Table } from "@tissuumaps/core";

import { TablesPanelItemSettings } from "./TablesPanelItemSettings";

export function TablesPanelItem({ table }: { table: Table }) {
  return (
    <>
      <TablesPanelItemSettings table={table} />
    </>
  );
}
