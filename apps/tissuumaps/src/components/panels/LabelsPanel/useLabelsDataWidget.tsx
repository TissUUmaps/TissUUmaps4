import { useMemo, useState } from "react";

import {
  type Labels,
  getActiveConfigSource,
  isGroupByConfig,
} from "@tissuumaps/core";

import { LabelsSettingsCategory } from "./category";

export function useLabelsDataWidget(labels: Labels) {
  const [activeSettingsCategory, setActiveSettingsCategory] =
    useState<LabelsSettingsCategory | null>(null);
  const [selectedGroupByColumn, setSelectedGroupByColumn] = useState<
    string | null
  >(null);

  const activeGroupByColumn = useMemo(() => {
    if (labels.dataSource.table !== undefined) {
      if (
        activeSettingsCategory === LabelsSettingsCategory.labelColor &&
        getActiveConfigSource(labels.labelColor) === "groupBy" &&
        isGroupByConfig(labels.labelColor)
      ) {
        return labels.labelColor.groupBy.column;
      }
      if (
        activeSettingsCategory === LabelsSettingsCategory.labelVisibility &&
        getActiveConfigSource(labels.labelVisibility) === "groupBy" &&
        isGroupByConfig(labels.labelVisibility)
      ) {
        return labels.labelVisibility.groupBy.column;
      }
      if (
        activeSettingsCategory === LabelsSettingsCategory.labelOpacity &&
        getActiveConfigSource(labels.labelOpacity) === "groupBy" &&
        isGroupByConfig(labels.labelOpacity)
      ) {
        return labels.labelOpacity.groupBy.column;
      }
    }
    return null;
  }, [
    labels.dataSource.table,
    activeSettingsCategory,
    labels.labelColor,
    labels.labelVisibility,
    labels.labelOpacity,
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
