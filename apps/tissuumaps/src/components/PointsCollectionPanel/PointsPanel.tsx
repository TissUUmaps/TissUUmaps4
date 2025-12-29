import { type Points } from "@tissuumaps/core";

import { PointsSettingsPanel } from "./PointsSettingsPanel";

type PointsPanelProps = {
  points: Points;
};

export function PointsPanel(props: PointsPanelProps) {
  return (
    <>
      <PointsSettingsPanel points={props.points} />
    </>
  );
}
