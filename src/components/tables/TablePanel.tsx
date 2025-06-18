import { ITableModel } from "../../models/table";
import TableSettingsPanel from "./TableSettingsPanel";

type TablePanelProps = {
  tableId: string;
  table: ITableModel;
};

export default function TablePanel(props: TablePanelProps) {
  return (
    <>
      <TableSettingsPanel tableId={props.tableId} table={props.table} />
    </>
  );
}
