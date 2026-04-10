import { useMemo } from "react";

import {
  type Labels,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

import { LabelsSettingsCategory } from "./category";

export function useLabelsDataWidget(
  labels: Labels,
  selectedTable: string | null,
  selectedGroupByColumn: string | null,
  activeSettingsCategory: LabelsSettingsCategory | null,
) {
  const [synced, syncedTable, syncedGroupByColumn] = useMemo(() => {
    if (
      activeSettingsCategory === LabelsSettingsCategory.labelColor &&
      getActiveConfigSource(labels.labelColor) === "groupBy" &&
      isGroupByConfig(labels.labelColor)
    ) {
      return [
        true,
        labels.labelColor.groupBy.table,
        labels.labelColor.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === LabelsSettingsCategory.labelVisibility &&
      getActiveConfigSource(labels.labelVisibility) === "groupBy" &&
      isGroupByConfig(labels.labelVisibility)
    ) {
      return [
        true,
        labels.labelVisibility.groupBy.table,
        labels.labelVisibility.groupBy.column,
      ];
    }
    if (
      activeSettingsCategory === LabelsSettingsCategory.labelOpacity &&
      getActiveConfigSource(labels.labelOpacity) === "groupBy" &&
      isGroupByConfig(labels.labelOpacity)
    ) {
      return [
        true,
        labels.labelOpacity.groupBy.table,
        labels.labelOpacity.groupBy.column,
      ];
    }
    return [false, selectedTable, selectedGroupByColumn];
  }, [
    selectedTable,
    selectedGroupByColumn,
    activeSettingsCategory,
    labels.labelColor,
    labels.labelVisibility,
    labels.labelOpacity,
  ]);

  return { synced, syncedTable, syncedGroupByColumn };
}
