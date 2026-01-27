import type { Points } from "@tissuumaps/core";

import { PointsPanelItemGroups } from "./PointsPanelItemGroups";
import { PointsPanelItemSettings } from "./PointsPanelItemSettings";

export function PointsPanelItem({ points }: { points: Points }) {
  return (
    <>
      <PointsPanelItemSettings points={points} />
      <PointsPanelItemGroups points={points} />
    </>
  );
}
