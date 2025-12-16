import { useTissUUmaps } from "../../store";
import { MapUtils } from "../../utils";
import { TablePanel } from "./TablePanel";

export function TableCollectionPanel() {
  const tableMap = useTissUUmaps((state) => state.tableMap);
  return (
    <>
      {tableMap &&
        MapUtils.map(tableMap, (tableId, table) => (
          <TablePanel key={tableId} tableId={tableId} table={table} />
        ))}
    </>
  );
}
