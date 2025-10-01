import { useBoundStore } from "../../store/boundStore";
import MapUtils from "../../utils/MapUtils";
import TablePanel from "./TablePanel";

export default function TableCollectionPanel() {
  const tableMap = useBoundStore((state) => state.tableMap);
  return (
    <>
      {tableMap &&
        MapUtils.map(tableMap, (tableId, table) => (
          <TablePanel key={tableId} tableId={tableId} table={table} />
        ))}
    </>
  );
}
