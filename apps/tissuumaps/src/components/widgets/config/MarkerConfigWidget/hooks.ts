import { useEffect, useState } from "react";

import {
  type Marker,
  type MarkerConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import {
  type MarkerConfigSource,
  type MarkerConfigWidgetAdapter,
} from "./adapter";

export function useMarkerConfigWidget(
  markerConfig: MarkerConfig,
  onMarkerConfigChange: (newMarkerConfig: MarkerConfig) => void,
  defaultMarker: Marker,
): MarkerConfigWidgetAdapter {
  const activeSource = getActiveConfigSource(markerConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<MarkerConfigSource>(
    markerConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<Marker>(
    isConstantConfig(markerConfig)
      ? markerConfig.constant.value
      : defaultMarker,
  );

  const [currentFromTable, setCurrentFromTable] = useState<string | null>(
    isFromConfig(markerConfig) ? markerConfig.from.table : null,
  );
  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(markerConfig) ? markerConfig.from.column : null,
  );

  const [currentGroupByTable, setCurrentGroupByTable] = useState<string | null>(
    isGroupByConfig(markerConfig) ? markerConfig.groupBy.table : null,
  );
  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | null
  >(isGroupByConfig(markerConfig) ? markerConfig.groupBy.column : null);
  const [currentGroupByMap, setCurrentGroupByMap] = useState<string | null>(
    isGroupByConfig(markerConfig) && markerConfig.groupBy.map !== undefined
      ? markerConfig.groupBy.map
      : null,
  );

  useEffect(() => {
    if (
      // constant is complete...
      currentSource === "constant" &&
      // ...and different from active config
      (activeSource !== "constant" ||
        !isConstantConfig(markerConfig) ||
        markerConfig.constant.value !== currentConstantValue)
    ) {
      onMarkerConfigChange({
        ...markerConfig,
        source: "constant",
        constant: { value: currentConstantValue },
      });
    } else if (
      // from is complete...
      currentSource === "from" &&
      currentFromTable !== null &&
      currentFromColumn !== null &&
      // ...and different from active config
      (activeSource !== "from" ||
        !isFromConfig(markerConfig) ||
        markerConfig.from.table !== currentFromTable ||
        markerConfig.from.column !== currentFromColumn)
    ) {
      onMarkerConfigChange({
        ...markerConfig,
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
      // ...and different from active config
      (activeSource !== "groupBy" ||
        !isGroupByConfig(markerConfig) ||
        markerConfig.groupBy.table !== currentGroupByTable ||
        markerConfig.groupBy.column !== currentGroupByColumn ||
        markerConfig.groupBy.map !== (currentGroupByMap ?? undefined))
    ) {
      onMarkerConfigChange({
        ...markerConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
          column: currentGroupByColumn,
          map: currentGroupByMap ?? undefined,
        },
      });
    }
  }, [
    markerConfig,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromTable,
    currentFromColumn,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    onMarkerConfigChange,
  ]);

  return {
    markerConfig,
    defaultMarker,
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
