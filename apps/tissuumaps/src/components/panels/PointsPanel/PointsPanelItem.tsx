import { type Points } from "@tissuumaps/core";

import { PointsPanelItemSettings } from "./PointsPanelItemSettings";

export function PointsPanelItem({ points }: { points: Points }) {
  return (
    <>
      <PointsPanelItemSettings points={points} />
    </>
  );
}
