import { useTissUUmaps } from "../../store";
import { MapUtils } from "../../utils/MapUtils";
import { ShapesPanel } from "./ShapesPanel";

export function ShapesCollectionPanel() {
  const shapesMap = useTissUUmaps((state) => state.shapesMap);
  return (
    <>
      {shapesMap &&
        MapUtils.map(shapesMap, (shapesId, shapes) => (
          <ShapesPanel key={shapesId} shapesId={shapesId} shapes={shapes} />
        ))}
    </>
  );
}
