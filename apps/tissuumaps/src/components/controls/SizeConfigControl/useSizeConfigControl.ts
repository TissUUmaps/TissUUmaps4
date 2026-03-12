import { useEffect, useState } from "react";

import {
  type CoordinateSpace,
  type SizeConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

type SizeConfigSource = Exclude<SizeConfig["source"], undefined>;

export type SizeConfigControlState = {
  sizeConfig: SizeConfig;
  defaultSize: number;
  defaultSizeUnit: CoordinateSpace;
  activeSource: SizeConfigSource;
  currentSource: SizeConfigSource;
  currentConstantValue: number;
  currentConstantUnit: CoordinateSpace;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentFromUnit: CoordinateSpace;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  currentGroupByUnit: CoordinateSpace;
  setCurrentSource: (newCurrentSource: SizeConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: number) => void;
  setCurrentConstantUnit: (newCurrentConstantUnit: CoordinateSpace) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentFromUnit: (newCurrentFromUnit: CoordinateSpace) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
  setCurrentGroupByUnit: (newCurrentGroupByUnit: CoordinateSpace) => void;
};

export function useSizeConfigControl(
  sizeConfig: SizeConfig,
  onSizeConfigChange: (newSizeConfig: SizeConfig) => void,
  defaultSize: number,
  defaultSizeUnit: CoordinateSpace,
): SizeConfigControlState {
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

  const [currentFromTable, setCurrentFromTable] = useState<string | null>(
    isFromConfig(sizeConfig) ? sizeConfig.from.table : null,
  );
  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(sizeConfig) ? sizeConfig.from.column : null,
  );
  const [currentFromUnit, setCurrentFromUnit] = useState<CoordinateSpace>(
    isFromConfig(sizeConfig) && sizeConfig.from.unit !== undefined
      ? sizeConfig.from.unit
      : defaultSizeUnit,
  );

  const [currentGroupByTable, setCurrentGroupByTable] = useState<string | null>(
    isGroupByConfig(sizeConfig) ? sizeConfig.groupBy.table : null,
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
      currentFromTable !== null &&
      currentFromColumn !== null &&
      // ...and different from active config
      (activeSource !== "from" ||
        !isFromConfig(sizeConfig) ||
        sizeConfig.from.table !== currentFromTable ||
        sizeConfig.from.column !== currentFromColumn ||
        sizeConfig.from.unit !== currentFromUnit)
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "from",
        from: {
          table: currentFromTable,
          column: currentFromColumn,
          unit: currentFromUnit,
        },
      });
    } else if (
      // groupBy is complete...
      currentSource === "groupBy" &&
      currentGroupByTable !== null &&
      currentGroupByColumn !== null &&
      currentGroupByMap !== null &&
      // ...and different from active config
      (activeSource !== "groupBy" ||
        !isGroupByConfig(sizeConfig) ||
        sizeConfig.groupBy.table !== currentGroupByTable ||
        sizeConfig.groupBy.column !== currentGroupByColumn ||
        sizeConfig.groupBy.map !== currentGroupByMap ||
        sizeConfig.groupBy.unit !== currentGroupByUnit)
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
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
    currentFromTable,
    currentFromColumn,
    currentFromUnit,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    currentGroupByUnit,
    onSizeConfigChange,
  ]);

  return {
    sizeConfig,
    defaultSize,
    defaultSizeUnit,
    activeSource,
    currentSource,
    currentConstantValue,
    currentConstantUnit,
    currentFromTable,
    currentFromColumn,
    currentFromUnit,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    currentGroupByUnit,
    setCurrentSource,
    setCurrentConstantValue,
    setCurrentConstantUnit,
    setCurrentFromTable,
    setCurrentFromColumn,
    setCurrentFromUnit,
    setCurrentGroupByTable,
    setCurrentGroupByColumn,
    setCurrentGroupByMap,
    setCurrentGroupByUnit,
  };
}
