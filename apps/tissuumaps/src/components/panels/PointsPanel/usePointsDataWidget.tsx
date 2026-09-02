import { useMemo, useState } from "react";

import {
  type Points,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

import { PointsSettingsCategory } from "./category";

export function usePointsDataWidget(points: Points) {
  const [activeSettingsCategory, setActiveSettingsCategory] =
    useState<PointsSettingsCategory | null>(null);
  const [selectedGroupByColumn, setSelectedGroupByColumn] = useState<
    string | null
  >(null);

  const activeGroupByColumn = useMemo(() => {
    if (points.dataSource.table !== undefined) {
      if (
        activeSettingsCategory === PointsSettingsCategory.pointMarker &&
        getActiveConfigSource(points.pointMarker) === "groupBy" &&
        isGroupByConfig(points.pointMarker)
      ) {
        return points.pointMarker.groupBy.column;
      }
      if (
        activeSettingsCategory === PointsSettingsCategory.pointSize &&
        getActiveConfigSource(points.pointSize) === "groupBy" &&
        isGroupByConfig(points.pointSize)
      ) {
        return points.pointSize.groupBy.column;
      }
      if (
        activeSettingsCategory === PointsSettingsCategory.pointColor &&
        getActiveConfigSource(points.pointColor) === "groupBy" &&
        isGroupByConfig(points.pointColor)
      ) {
        return points.pointColor.groupBy.column;
      }
      if (
        activeSettingsCategory === PointsSettingsCategory.pointVisibility &&
        getActiveConfigSource(points.pointVisibility) === "groupBy" &&
        isGroupByConfig(points.pointVisibility)
      ) {
        return points.pointVisibility.groupBy.column;
      }
      if (
        activeSettingsCategory === PointsSettingsCategory.pointOpacity &&
        getActiveConfigSource(points.pointOpacity) === "groupBy" &&
        isGroupByConfig(points.pointOpacity)
      ) {
        return points.pointOpacity.groupBy.column;
      }
    }
    return null;
  }, [
    points.dataSource.table,
    activeSettingsCategory,
    points.pointMarker,
    points.pointSize,
    points.pointColor,
    points.pointVisibility,
    points.pointOpacity,
  ]);

  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  const [prevActiveGroupByColumn, setPrevActiveGroupByColumn] =
    useState(activeGroupByColumn);
  if (activeGroupByColumn !== prevActiveGroupByColumn) {
    setPrevActiveGroupByColumn(activeGroupByColumn);
    if (activeGroupByColumn !== null) {
      setSelectedGroupByColumn(activeGroupByColumn);
    }
  }

  return {
    activeSettingsCategory,
    setActiveSettingsCategory,
    selectedGroupByColumn,
    setSelectedGroupByColumn,
  };
}
