import { Tab, Tabs } from "react-bootstrap";

import { PointsModel } from "../../models/points";
import { useSharedStore } from "../../stores/sharedStore";
import MapUtils from "../../utils/MapUtils";
import PointsPanel from "./PointsPanel";

export default function PointsCollectionPanel() {
  const pointsCollection = useSharedStore((state) => state.points);
  return (
    <Tabs>
      {MapUtils.map(
        pointsCollection ?? new Map<string, PointsModel>(),
        (pointsId, points) => (
          <Tab key={pointsId} title={points.name}>
            <PointsPanel pointsId={pointsId} points={points} />
          </Tab>
        ),
      )}
    </Tabs>
  );
}
