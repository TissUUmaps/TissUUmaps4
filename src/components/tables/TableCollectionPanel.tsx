import { useSharedStore } from "../../stores/sharedStore";
import MapUtils from "../../utils/MapUtils";
import TablePanel from "./TablePanel";

export default function TableCollectionPanel() {
  const tables = useSharedStore((state) => state.tables);
  return (
    <>
      {tables &&
        MapUtils.map(tables, (tableId, table) => (
          <TablePanel key={tableId} tableId={tableId} table={table} />
        ))}
    </>
  );
}
