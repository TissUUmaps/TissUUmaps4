import { useTissUUmaps } from "../../store";
import { MapUtils } from "../../utils/MapUtils";
import { PointsPanel } from "./PointsPanel";

export function PointsCollectionPanel() {
  const pointsMap = useTissUUmaps((state) => state.pointsMap);
  return (
    <>
      {pointsMap &&
        MapUtils.map(pointsMap, (pointsId, points) => (
          <PointsPanel key={pointsId} pointsId={pointsId} points={points} />
        ))}
    </>
  );
}
