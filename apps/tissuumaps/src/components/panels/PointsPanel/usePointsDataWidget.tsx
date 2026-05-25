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
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedGroupByColumn, setSelectedGroupByColumn] = useState<
    string | null
  >(null);

  const [activeTable, activeGroupByColumn] = useMemo(() => {
    if (points.dataSource.table !== undefined) {
      if (
        activeSettingsCategory === PointsSettingsCategory.pointMarker &&
        getActiveConfigSource(points.pointMarker) === "groupBy" &&
        isGroupByConfig(points.pointMarker)
      ) {
        return [
          points.dataSource.table,
          points.pointMarker.groupBy.column,
        ] as const;
      }
      if (
        activeSettingsCategory === PointsSettingsCategory.pointSize &&
        getActiveConfigSource(points.pointSize) === "groupBy" &&
        isGroupByConfig(points.pointSize)
      ) {
        return [
          points.dataSource.table,
          points.pointSize.groupBy.column,
        ] as const;
      }
      if (
        activeSettingsCategory === PointsSettingsCategory.pointColor &&
        getActiveConfigSource(points.pointColor) === "groupBy" &&
        isGroupByConfig(points.pointColor)
      ) {
        return [
          points.dataSource.table,
          points.pointColor.groupBy.column,
        ] as const;
      }
      if (
        activeSettingsCategory === PointsSettingsCategory.pointVisibility &&
        getActiveConfigSource(points.pointVisibility) === "groupBy" &&
        isGroupByConfig(points.pointVisibility)
      ) {
        return [
          points.dataSource.table,
          points.pointVisibility.groupBy.column,
        ] as const;
      }
      if (
        activeSettingsCategory === PointsSettingsCategory.pointOpacity &&
        getActiveConfigSource(points.pointOpacity) === "groupBy" &&
        isGroupByConfig(points.pointOpacity)
      ) {
        return [
          points.dataSource.table,
          points.pointOpacity.groupBy.column,
        ] as const;
      }
    }
    return [null, null] as const;
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
  const [prevActiveTable, setPrevActiveTable] = useState(activeTable);
  if (activeTable !== prevActiveTable) {
    setPrevActiveTable(activeTable);
    if (activeTable !== null) {
      setSelectedTable(activeTable);
    }
  }

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
    selectedTable,
    setSelectedTable,
    selectedGroupByColumn,
    setSelectedGroupByColumn,
  };
}
