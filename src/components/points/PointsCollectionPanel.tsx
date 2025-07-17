import { useBoundStore } from "../../stores/boundStore";
import MapUtils from "../../utils/MapUtils";
import PointsPanel from "./PointsPanel";

export default function PointsCollectionPanel() {
  const pointsMap = useBoundStore((state) => state.pointsMap);
  return (
    <>
      {pointsMap &&
        MapUtils.map(pointsMap, (pointsId, points) => (
          <PointsPanel key={pointsId} pointsId={pointsId} points={points} />
        ))}
    </>
  );
}
