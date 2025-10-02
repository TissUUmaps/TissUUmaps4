import { CompleteTable } from "../../model/table";
import TableSettingsPanel from "./TableSettingsPanel";

type TablePanelProps = {
  tableId: string;
  table: CompleteTable;
};

export default function TablePanel(props: TablePanelProps) {
  return (
    <>
      <TableSettingsPanel tableId={props.tableId} table={props.table} />
    </>
  );
}
