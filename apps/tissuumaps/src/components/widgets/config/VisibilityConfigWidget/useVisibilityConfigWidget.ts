import { useEffect, useState } from "react";

import {
  type VisibilityConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

type VisibilityConfigSource = Exclude<VisibilityConfig["source"], undefined>;

export type VisibilityConfigWidgetState = {
  visibilityConfig: VisibilityConfig;
  defaultVisibility: boolean;
  activeSource: VisibilityConfigSource;
  currentSource: VisibilityConfigSource;
  currentConstantValue: boolean;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  setCurrentSource: (newCurrentSource: VisibilityConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: boolean) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
};

export function useVisibilityConfigWidget(
  visibilityConfig: VisibilityConfig,
  onVisibilityConfigChange: (newVisibilityConfig: VisibilityConfig) => void,
  defaultVisibility: boolean,
): VisibilityConfigWidgetState {
  const activeSource = getActiveConfigSource(visibilityConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<VisibilityConfigSource>(
    visibilityConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<boolean>(
    isConstantConfig(visibilityConfig)
      ? visibilityConfig.constant.value
      : defaultVisibility,
  );

  const [currentFromTable, setCurrentFromTable] = useState<string | null>(
    isFromConfig(visibilityConfig) ? visibilityConfig.from.table : null,
  );
  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(visibilityConfig) ? visibilityConfig.from.column : null,
  );

  const [currentGroupByTable, setCurrentGroupByTable] = useState<string | null>(
    isGroupByConfig(visibilityConfig) ? visibilityConfig.groupBy.table : null,
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
      currentFromTable !== null &&
      currentFromColumn !== null &&
      // ...and different from active config
      (activeSource !== "from" ||
        !isFromConfig(visibilityConfig) ||
        visibilityConfig.from.table !== currentFromTable ||
        visibilityConfig.from.column !== currentFromColumn)
    ) {
      onVisibilityConfigChange({
        ...visibilityConfig,
        source: "from",
        from: {
          table: currentFromTable,
          column: currentFromColumn,
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
        !isGroupByConfig(visibilityConfig) ||
        visibilityConfig.groupBy.table !== currentGroupByTable ||
        visibilityConfig.groupBy.column !== currentGroupByColumn ||
        visibilityConfig.groupBy.map !== currentGroupByMap)
    ) {
      onVisibilityConfigChange({
        ...visibilityConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
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
    currentFromTable,
    currentFromColumn,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    onVisibilityConfigChange,
  ]);

  return {
    visibilityConfig,
    defaultVisibility,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromTable,
    currentFromColumn,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    setCurrentSource,
    setCurrentConstantValue,
    setCurrentFromTable,
    setCurrentFromColumn,
    setCurrentGroupByTable,
    setCurrentGroupByColumn,
    setCurrentGroupByMap,
  };
}
