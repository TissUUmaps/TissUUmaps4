import { useBoundStore } from "../../stores/boundStore";
import MapUtils from "../../utils/MapUtils";
import PointsPanel from "./PointsPanel";

export default function PointsCollectionPanel() {
  const points = useBoundStore((state) => state.points);
  return (
    <>
      {points &&
        MapUtils.map(points, (pointsId, points) => (
          <PointsPanel key={pointsId} pointsId={pointsId} points={points} />
        ))}
    </>
  );
}
