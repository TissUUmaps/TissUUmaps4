import { type Table } from "@tissuumaps/core";

import { TableSettingsPanel } from "./TableSettingsPanel";

type TablePanelProps = {
  table: Table;
};

export function TablePanel(props: TablePanelProps) {
  return (
    <>
      <TableSettingsPanel table={props.table} />
    </>
  );
}
