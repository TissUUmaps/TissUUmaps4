import { useBoundStore } from "../../stores/boundStore";
import MapUtils from "../../utils/MapUtils";
import ShapesPanel from "./ShapesPanel";

export default function ShapesCollectionPanel() {
  const shapes = useBoundStore((state) => state.shapes);
  return (
    <>
      {shapes &&
        MapUtils.map(shapes, (shapesId, shapes) => (
          <ShapesPanel key={shapesId} shapesId={shapesId} shapes={shapes} />
        ))}
    </>
  );
}
