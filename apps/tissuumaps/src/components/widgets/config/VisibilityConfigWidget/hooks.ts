import { useEffect, useState } from "react";

import {
  type VisibilityConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import {
  type VisibilityConfigSource,
  type VisibilityConfigWidgetAdapter,
} from "./adapter";

export function useVisibilityConfigWidget(
  visibilityConfig: VisibilityConfig,
  onVisibilityConfigChange: (newVisibilityConfig: VisibilityConfig) => void,
  defaultVisibility: boolean,
  tableId: string | null,
): VisibilityConfigWidgetAdapter {
  const activeSource = getActiveConfigSource(visibilityConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<VisibilityConfigSource>(
    visibilityConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<boolean>(
    isConstantConfig(visibilityConfig)
      ? visibilityConfig.constant.value
      : defaultVisibility,
  );

  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(visibilityConfig) ? visibilityConfig.from.column : null,
  );

  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | null
  >(isGroupByConfig(visibilityConfig) ? visibilityConfig.groupBy.column : null);
  const [currentGroupByMap, setCurrentGroupByMap] = useState<string | null>(
    isGroupByConfig(visibilityConfig) &&
      visibilityConfig.groupBy.map !== undefined
      ? visibilityConfig.groupBy.map
      : null,
  );

  useEffect(() => {
    if (
      // constant is complete...
      currentSource === "constant" &&
      // ...and different from active config
      (activeSource !== "constant" ||
        !isConstantConfig(visibilityConfig) ||
        visibilityConfig.constant.value !== currentConstantValue)
    ) {
      onVisibilityConfigChange({
        ...visibilityConfig,
        source: "constant",
        constant: {
          value: currentConstantValue,
        },
      });
    } else if (
      // from is complete...
      currentSource === "from" &&
      currentFromColumn !== null &&
      // ...and different from active config
      (activeSource !== "from" ||
        !isFromConfig(visibilityConfig) ||
        visibilityConfig.from.column !== currentFromColumn)
    ) {
      onVisibilityConfigChange({
        ...visibilityConfig,
        source: "from",
        from: {
          column: currentFromColumn,
        },
      });
    } else if (
      // groupBy is complete...
      currentSource === "groupBy" &&
      currentGroupByColumn !== null &&
      currentGroupByMap !== null &&
      // ...and different from active config
      (activeSource !== "groupBy" ||
        !isGroupByConfig(visibilityConfig) ||
        visibilityConfig.groupBy.column !== currentGroupByColumn ||
        visibilityConfig.groupBy.map !== currentGroupByMap)
    ) {
      onVisibilityConfigChange({
        ...visibilityConfig,
        source: "groupBy",
        groupBy: {
          column: currentGroupByColumn,
          map: currentGroupByMap,
        },
      });
    }
  }, [
    visibilityConfig,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromColumn,
    currentGroupByColumn,
    currentGroupByMap,
    onVisibilityConfigChange,
  ]);

  return {
    visibilityConfig,
    defaultVisibility,
    tableId,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromColumn,
    currentGroupByColumn,
    currentGroupByMap,
    setCurrentSource,
    setCurrentConstantValue,
    setCurrentFromColumn,
    setCurrentGroupByColumn,
    setCurrentGroupByMap,
  };
}
