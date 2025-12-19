import { type Points } from "@tissuumaps/core";

import { PointsSettingsPanel } from "./PointsSettingsPanel";

type PointsPanelProps = {
  pointsId: string;
  points: Points;
};

export function PointsPanel(props: PointsPanelProps) {
  return (
    <>
      <PointsSettingsPanel pointsId={props.pointsId} points={props.points} />
    </>
  );
}
