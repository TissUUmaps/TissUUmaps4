import { useEffect, useState } from "react";

import {
  type CoordinateSpace,
  type SizeConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import type { SizeConfigSource, SizeConfigWidgetAdapter } from "./adapter";

export function useSizeConfigWidget(
  sizeConfig: SizeConfig,
  onSizeConfigChange: (newSizeConfig: SizeConfig) => void,
  defaultSize: number,
  defaultSizeUnit: CoordinateSpace,
  tableId: string | null,
): SizeConfigWidgetAdapter {
  const activeSource = getActiveConfigSource(sizeConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<SizeConfigSource>(
    sizeConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<number>(
    isConstantConfig(sizeConfig) ? sizeConfig.constant.value : defaultSize,
  );
  const [currentConstantUnit, setCurrentConstantUnit] =
    useState<CoordinateSpace>(
      isConstantConfig(sizeConfig) && sizeConfig.constant.unit !== undefined
        ? sizeConfig.constant.unit
        : defaultSizeUnit,
    );

  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(sizeConfig) ? sizeConfig.from.column : null,
  );
  const [currentFromUnit, setCurrentFromUnit] = useState<CoordinateSpace>(
    isFromConfig(sizeConfig) && sizeConfig.from.unit !== undefined
      ? sizeConfig.from.unit
      : defaultSizeUnit,
  );

  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | null
  >(isGroupByConfig(sizeConfig) ? sizeConfig.groupBy.column : null);
  const [currentGroupByMap, setCurrentGroupByMap] = useState<string | null>(
    isGroupByConfig(sizeConfig) && sizeConfig.groupBy.map !== undefined
      ? sizeConfig.groupBy.map
      : null,
  );
  const [currentGroupByUnit, setCurrentGroupByUnit] = useState<CoordinateSpace>(
    isGroupByConfig(sizeConfig) && sizeConfig.groupBy.unit !== undefined
      ? sizeConfig.groupBy.unit
      : defaultSizeUnit,
  );

  useEffect(() => {
    if (
      // constant is complete...
      currentSource === "constant" &&
      // ...and different from active config
      (activeSource !== "constant" ||
        !isConstantConfig(sizeConfig) ||
        sizeConfig.constant.value !== currentConstantValue ||
        sizeConfig.constant.unit !== currentConstantUnit)
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "constant",
        constant: {
          value: currentConstantValue,
          unit: currentConstantUnit,
        },
      });
    } else if (
      // from is complete...
      currentSource === "from" &&
      currentFromColumn !== null &&
      // ...and different from active config
      (activeSource !== "from" ||
        !isFromConfig(sizeConfig) ||
        sizeConfig.from.column !== currentFromColumn ||
        sizeConfig.from.unit !== currentFromUnit)
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "from",
        from: {
          column: currentFromColumn,
          unit: currentFromUnit,
        },
      });
    } else if (
      // groupBy is complete...
      currentSource === "groupBy" &&
      currentGroupByColumn !== null &&
      currentGroupByMap !== null &&
      // ...and different from active config
      (activeSource !== "groupBy" ||
        !isGroupByConfig(sizeConfig) ||
        sizeConfig.groupBy.column !== currentGroupByColumn ||
        sizeConfig.groupBy.map !== currentGroupByMap ||
        sizeConfig.groupBy.unit !== currentGroupByUnit)
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "groupBy",
        groupBy: {
          column: currentGroupByColumn,
          map: currentGroupByMap,
          unit: currentGroupByUnit,
        },
      });
    }
  }, [
    sizeConfig,
    activeSource,
    currentSource,
    currentConstantValue,
    currentConstantUnit,
    currentFromColumn,
    currentFromUnit,
    currentGroupByColumn,
    currentGroupByMap,
    currentGroupByUnit,
    onSizeConfigChange,
  ]);

  return {
    sizeConfig,
    defaultSize,
    defaultSizeUnit,
    tableId,
    activeSource,
    currentSource,
    currentConstantValue,
    currentConstantUnit,
    currentFromColumn,
    currentFromUnit,
    currentGroupByColumn,
    currentGroupByMap,
    currentGroupByUnit,
    setCurrentSource,
    setCurrentConstantValue,
    setCurrentConstantUnit,
    setCurrentFromColumn,
    setCurrentFromUnit,
    setCurrentGroupByColumn,
    setCurrentGroupByMap,
    setCurrentGroupByUnit,
  };
}
