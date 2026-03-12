import { type Table } from "@tissuumaps/core";

import { TablesPanelItemSettings } from "./TablesPanelItemSettings";

export type TablesPanelItemProps = {
  table: Table;
};

export function TablesPanelItem({ table }: TablesPanelItemProps) {
  return (
    <>
      <TablesPanelItemSettings table={table} />
    </>
  );
}
