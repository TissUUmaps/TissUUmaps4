import type { Points } from "@tissuumaps/core";

import { PointsItemGroups } from "./PointsItemGroups";
import { PointsItemSettings } from "./PointsItemSettings";

export function PointsItem({ points }: { points: Points }) {
  return (
    <>
      <PointsItemSettings points={points} />
      <PointsItemGroups points={points} />
    </>
  );
}
