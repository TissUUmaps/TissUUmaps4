import { type Table } from "@tissuumaps/core";

import { TableSettingsPanel } from "./TableSettingsPanel";

type TablePanelProps = {
  tableId: string;
  table: Table;
};

export function TablePanel(props: TablePanelProps) {
  return (
    <>
      <TableSettingsPanel tableId={props.tableId} table={props.table} />
    </>
  );
}
