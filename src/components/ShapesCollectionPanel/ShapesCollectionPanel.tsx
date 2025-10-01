import { useBoundStore } from "../../store/boundStore";
import MapUtils from "../../utils/MapUtils";
import ShapesPanel from "./ShapesPanel";

export default function ShapesCollectionPanel() {
  const shapesMap = useBoundStore((state) => state.shapesMap);
  return (
    <>
      {shapesMap &&
        MapUtils.map(shapesMap, (shapesId, shapes) => (
          <ShapesPanel key={shapesId} shapesId={shapesId} shapes={shapes} />
        ))}
    </>
  );
}
