import { useTissUUmaps } from "../../store";
import { PointsPanel } from "./PointsPanel";

export function PointsCollectionPanel() {
  const points = useTissUUmaps((state) => state.points);
  return (
    <>
      {points.map((currentPoints) => (
        <PointsPanel key={currentPoints.id} points={currentPoints} />
      ))}
    </>
  );
}
