import { useTissUUmaps } from "../../store";
import { ShapesPanel } from "./ShapesPanel";

export function ShapesCollectionPanel() {
  const shapes = useTissUUmaps((state) => state.shapes);
  return (
    <>
      {shapes.map((currentShapes) => (
        <ShapesPanel key={currentShapes.id} shapes={currentShapes} />
      ))}
    </>
  );
}
