import { deepEqual } from "fast-equals";
import { useEffect, useState } from "react";

import {
  type Color,
  type ColorConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "@tissuumaps/core";

import {
  type ColorConfigSource,
  type ColorConfigWidgetAdapter,
} from "./adapter";

export function useColorConfigWidget(
  colorConfig: ColorConfig,
  onColorConfigChange: (newColorConfig: ColorConfig) => void,
  defaultColor: Color,
  tableId: string | null,
): ColorConfigWidgetAdapter {
  const activeSource = getActiveConfigSource(colorConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<ColorConfigSource>(
    colorConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<Color>(
    isConstantConfig(colorConfig) ? colorConfig.constant.value : defaultColor,
  );

  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(colorConfig) ? colorConfig.from.column : null,
  );
  const [currentFromRangeMin, setCurrentFromRangeMin] = useState<number | null>(
    isFromConfig(colorConfig) && colorConfig.from.range !== undefined
      ? colorConfig.from.range[0]
      : null,
  );
  const [currentFromRangeMax, setCurrentFromRangeMax] = useState<number | null>(
    isFromConfig(colorConfig) && colorConfig.from.range !== undefined
      ? colorConfig.from.range[1]
      : null,
  );
  const [currentFromPalette, setCurrentFromPalette] = useState<string | null>(
    isFromConfig(colorConfig) ? colorConfig.from.palette : null,
  );

  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | null
  >(isGroupByConfig(colorConfig) ? colorConfig.groupBy.column : null);
  const [currentGroupByPalette, setCurrentGroupByPalette] = useState<
    string | null
  >(
    isGroupByConfig(colorConfig) && colorConfig.groupBy.palette !== undefined
      ? colorConfig.groupBy.palette
      : null,
  );
  const [currentGroupByMap, setCurrentGroupByMap] = useState<string | null>(
    isGroupByConfig(colorConfig) && colorConfig.groupBy.map !== undefined
      ? colorConfig.groupBy.map
      : null,
  );

  const [currentRandomPalette, setCurrentRandomPalette] = useState<
    string | null
  >(isRandomConfig(colorConfig) ? colorConfig.random.palette : null);

  useEffect(() => {
    const currentFromRange: [number, number] | null =
      currentFromRangeMin !== null && currentFromRangeMax !== null
        ? [currentFromRangeMin, currentFromRangeMax]
        : null;
    if (
      // constant is complete...
      currentSource === "constant" &&
      // ...and different from active config
      (activeSource !== "constant" ||
        !isConstantConfig(colorConfig) ||
        colorConfig.constant.value !== currentConstantValue)
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "constant",
        constant: { value: currentConstantValue },
      });
    } else if (
      // from is complete...
      currentSource === "from" &&
      currentFromColumn !== null &&
      currentFromPalette !== null &&
      // ...and different from active config
      (activeSource !== "from" ||
        !isFromConfig(colorConfig) ||
        colorConfig.from.column !== currentFromColumn ||
        !deepEqual(colorConfig.from.range, currentFromRange ?? undefined) ||
        colorConfig.from.palette !== currentFromPalette)
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "from",
        from: {
          column: currentFromColumn,
          range: currentFromRange !== null ? currentFromRange : undefined,
          palette: currentFromPalette,
        },
      });
    } else if (
      // groupBy is complete...
      currentSource === "groupBy" &&
      currentGroupByColumn !== null &&
      (currentGroupByPalette !== null || currentGroupByMap !== null) &&
      // ...and different from active config
      (activeSource !== "groupBy" ||
        !isGroupByConfig(colorConfig) ||
        colorConfig.groupBy.column !== currentGroupByColumn ||
        colorConfig.groupBy.palette !== (currentGroupByPalette ?? undefined) ||
        colorConfig.groupBy.map !== (currentGroupByMap ?? undefined))
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "groupBy",
        groupBy: {
          column: currentGroupByColumn,
          palette: currentGroupByPalette ?? undefined,
          map: currentGroupByMap ?? undefined,
        },
      });
    } else if (
      // random is complete...
      currentSource === "random" &&
      currentRandomPalette !== null &&
      // ...and different from active config
      (activeSource !== "random" ||
        !isRandomConfig(colorConfig) ||
        colorConfig.random.palette !== currentRandomPalette)
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "random",
        random: {
          palette: currentRandomPalette,
        },
      });
    }
  }, [
    colorConfig,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromColumn,
    currentFromRangeMin,
    currentFromRangeMax,
    currentFromPalette,
    currentGroupByColumn,
    currentGroupByPalette,
    currentGroupByMap,
    currentRandomPalette,
    onColorConfigChange,
  ]);

  return {
    colorConfig,
    defaultColor,
    tableId,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromColumn,
    currentFromRangeMin,
    currentFromRangeMax,
    currentFromPalette,
    currentGroupByColumn,
    currentGroupByPalette,
    currentGroupByMap,
    currentRandomPalette,
    setCurrentSource,
    setCurrentConstantValue,
    setCurrentFromColumn,
    setCurrentFromRangeMin,
    setCurrentFromRangeMax,
    setCurrentFromPalette,
    setCurrentGroupByColumn,
    setCurrentGroupByPalette,
    setCurrentGroupByMap,
    setCurrentRandomPalette,
  };
}
