import { useEffect, useState } from "react";

import {
  type OpacityConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import {
  type OpacityConfigSource,
  type OpacityConfigWidgetAdapter,
} from "./adapter";

export function useOpacityConfigWidget(
  opacityConfig: OpacityConfig,
  onOpacityConfigChange: (newOpacityConfig: OpacityConfig) => void,
  defaultOpacity: number,
  tableId: string | null,
): OpacityConfigWidgetAdapter {
  const activeSource = getActiveConfigSource(opacityConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<OpacityConfigSource>(
    opacityConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<number>(
    isConstantConfig(opacityConfig)
      ? opacityConfig.constant.value
      : defaultOpacity,
  );

  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(opacityConfig) ? opacityConfig.from.column : null,
  );

  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | null
  >(isGroupByConfig(opacityConfig) ? opacityConfig.groupBy.column : null);
  const [currentGroupByMap, setCurrentGroupByMap] = useState<string | null>(
    isGroupByConfig(opacityConfig) && opacityConfig.groupBy.map !== undefined
      ? opacityConfig.groupBy.map
      : null,
  );

  useEffect(() => {
    if (
      // constant is complete...
      currentSource === "constant" &&
      // ...and different from active config
      (activeSource !== "constant" ||
        !isConstantConfig(opacityConfig) ||
        opacityConfig.constant.value !== currentConstantValue)
    ) {
      onOpacityConfigChange({
        ...opacityConfig,
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
        !isFromConfig(opacityConfig) ||
        opacityConfig.from.column !== currentFromColumn)
    ) {
      onOpacityConfigChange({
        ...opacityConfig,
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
        !isGroupByConfig(opacityConfig) ||
        opacityConfig.groupBy.column !== currentGroupByColumn ||
        opacityConfig.groupBy.map !== currentGroupByMap)
    ) {
      onOpacityConfigChange({
        ...opacityConfig,
        source: "groupBy",
        groupBy: {
          column: currentGroupByColumn,
          map: currentGroupByMap,
        },
      });
    }
  }, [
    opacityConfig,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromColumn,
    currentGroupByColumn,
    currentGroupByMap,
    onOpacityConfigChange,
  ]);

  return {
    opacityConfig,
    defaultOpacity,
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
