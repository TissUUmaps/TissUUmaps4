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

type ColorConfigSource = Exclude<ColorConfig["source"], undefined>;

export type ColorConfigControlState = {
  colorConfig: ColorConfig;
  defaultColor: Color;
  activeSource: ColorConfigSource;
  currentSource: ColorConfigSource;
  currentConstantValue: Color;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentFromRangeMin: number | null;
  currentFromRangeMax: number | null;
  currentFromPalette: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByPalette: string | null;
  currentGroupByMap: string | null;
  currentRandomPalette: string | null;
  setCurrentSource: (newCurrentSource: ColorConfigSource) => void;
  setCurrentConstantValue: (newCurrentValue: Color) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentFromRangeMin: (newCurrentFromRangeMin: number | null) => void;
  setCurrentFromRangeMax: (newCurrentFromRangeMax: number | null) => void;
  setCurrentFromPalette: (newCurrentFromPalette: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByPalette: (newCurrentGroupByPalette: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
  setCurrentRandomPalette: (newCurrentRandomPalette: string | null) => void;
};

export function useColorConfigControl(
  colorConfig: ColorConfig,
  onColorConfigChange: (newColorConfig: ColorConfig) => void,
  defaultColor: Color,
): ColorConfigControlState {
  const activeSource = getActiveConfigSource(colorConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<ColorConfigSource>(
    colorConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<Color>(
    isConstantConfig(colorConfig) ? colorConfig.constant.value : defaultColor,
  );

  const [currentFromTable, setCurrentFromTable] = useState<string | null>(
    isFromConfig(colorConfig) ? colorConfig.from.table : null,
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

  const [currentGroupByTable, setCurrentGroupByTable] = useState<string | null>(
    isGroupByConfig(colorConfig) ? colorConfig.groupBy.table : null,
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
      currentFromTable !== null &&
      currentFromColumn !== null &&
      currentFromPalette !== null &&
      // ...and different from active config
      (activeSource !== "from" ||
        !isFromConfig(colorConfig) ||
        colorConfig.from.table !== currentFromTable ||
        colorConfig.from.column !== currentFromColumn ||
        !deepEqual(colorConfig.from.range, currentFromRange ?? undefined) ||
        colorConfig.from.palette !== currentFromPalette)
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "from",
        from: {
          table: currentFromTable,
          column: currentFromColumn,
          range: currentFromRange !== null ? currentFromRange : undefined,
          palette: currentFromPalette,
        },
      });
    } else if (
      // groupBy is complete...
      currentSource === "groupBy" &&
      currentGroupByTable !== null &&
      currentGroupByColumn !== null &&
      (currentGroupByPalette !== null || currentGroupByMap !== null) &&
      // ...and different from active config
      (activeSource !== "groupBy" ||
        !isGroupByConfig(colorConfig) ||
        colorConfig.groupBy.table !== currentGroupByTable ||
        colorConfig.groupBy.column !== currentGroupByColumn ||
        colorConfig.groupBy.palette !== (currentGroupByPalette ?? undefined) ||
        colorConfig.groupBy.map !== (currentGroupByMap ?? undefined))
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
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
    currentFromTable,
    currentFromColumn,
    currentFromRangeMin,
    currentFromRangeMax,
    currentFromPalette,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByPalette,
    currentGroupByMap,
    currentRandomPalette,
    onColorConfigChange,
  ]);

  return {
    colorConfig,
    defaultColor,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromTable,
    currentFromColumn,
    currentFromRangeMin,
    currentFromRangeMax,
    currentFromPalette,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByPalette,
    currentGroupByMap,
    currentRandomPalette,
    setCurrentSource,
    setCurrentConstantValue,
    setCurrentFromTable,
    setCurrentFromColumn,
    setCurrentFromRangeMin,
    setCurrentFromRangeMax,
    setCurrentFromPalette,
    setCurrentGroupByTable,
    setCurrentGroupByColumn,
    setCurrentGroupByPalette,
    setCurrentGroupByMap,
    setCurrentRandomPalette,
  };
}
