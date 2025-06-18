import { useSharedStore } from "../../stores/sharedStore";
import MapUtils from "../../utils/MapUtils";
import ShapesPanel from "./ShapesPanel";

export default function ShapesCollectionPanel() {
  const shapes = useSharedStore((state) => state.shapes);
  return (
    <>
      {shapes &&
        MapUtils.map(shapes, (shapesId, shapes) => (
          <ShapesPanel key={shapesId} shapesId={shapesId} shapes={shapes} />
        ))}
    </>
  );
}
