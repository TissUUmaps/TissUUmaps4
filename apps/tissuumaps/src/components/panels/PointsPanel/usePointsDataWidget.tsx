import { useMemo } from "react";

import {
  type Points,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

import { PointsSettingsCategory } from "./category";

export function usePointsDataWidget(
  points: Points,
  selectedTable: string | null,
  selectedGroupByColumn: string | null,
  activeSettingsCategory: PointsSettingsCategory | null,
) {
  const [synced, syncedTable, syncedGroupByColumn] = useMemo(() => {
    if (
      activeSettingsCategory === PointsSettingsCategory.pointMarker &&
      getActiveConfigSource(points.pointMarker) === "groupBy" &&
      isGroupByConfig(points.pointMarker)
    ) {
      return [
        true,
        points.pointMarker.groupBy.table,
        points.pointMarker.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === PointsSettingsCategory.pointSize &&
      getActiveConfigSource(points.pointSize) === "groupBy" &&
      isGroupByConfig(points.pointSize)
    ) {
      return [
        true,
        points.pointSize.groupBy.table,
        points.pointSize.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === PointsSettingsCategory.pointColor &&
      getActiveConfigSource(points.pointColor) === "groupBy" &&
      isGroupByConfig(points.pointColor)
    ) {
      return [
        true,
        points.pointColor.groupBy.table,
        points.pointColor.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === PointsSettingsCategory.pointVisibility &&
      getActiveConfigSource(points.pointVisibility) === "groupBy" &&
      isGroupByConfig(points.pointVisibility)
    ) {
      return [
        true,
        points.pointVisibility.groupBy.table,
        points.pointVisibility.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === PointsSettingsCategory.pointOpacity &&
      getActiveConfigSource(points.pointOpacity) === "groupBy" &&
      isGroupByConfig(points.pointOpacity)
    ) {
      return [
        true,
        points.pointOpacity.groupBy.table,
        points.pointOpacity.groupBy.column,
      ];
    }
    return [false, selectedTable, selectedGroupByColumn];
  }, [
    selectedTable,
    selectedGroupByColumn,
    activeSettingsCategory,
    points.pointMarker,
    points.pointSize,
    points.pointColor,
    points.pointVisibility,
    points.pointOpacity,
  ]);

  return { synced, syncedTable, syncedGroupByColumn };
}
