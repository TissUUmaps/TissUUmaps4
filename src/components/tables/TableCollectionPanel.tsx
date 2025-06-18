import { useBoundStore } from "../../stores/boundStore";
import MapUtils from "../../utils/MapUtils";
import TablePanel from "./TablePanel";

export default function TableCollectionPanel() {
  const tables = useBoundStore((state) => state.tables);
  return (
    <>
      {tables &&
        MapUtils.map(tables, (tableId, table) => (
          <TablePanel key={tableId} tableId={tableId} table={table} />
        ))}
    </>
  );
}
