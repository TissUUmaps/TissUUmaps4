import { useTissUUmaps } from "../../store";
import { TablePanel } from "./TablePanel";

export function TableCollectionPanel() {
  const tables = useTissUUmaps((state) => state.tables);
  return (
    <>
      {tables.map((table) => (
        <TablePanel key={table.id} table={table} />
      ))}
    </>
  );
}
