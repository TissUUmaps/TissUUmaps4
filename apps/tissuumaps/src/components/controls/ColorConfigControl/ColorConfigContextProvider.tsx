import { deepEqual } from "fast-equals";
import { type ReactNode, useEffect, useState } from "react";

import {
  type Color,
  type ColorConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "@tissuumaps/core";

import { ColorConfigContext } from "./context";

type ColorConfigSource = Exclude<ColorConfig["source"], undefined>;

export type ColorConfigContextProviderProps = {
  colorConfig: ColorConfig;
  onColorConfigChange: (newColorConfig: ColorConfig) => void;
  defaultColor: Color;
  children: ReactNode;
};

export function ColorConfigContextProvider({
  colorConfig,
  onColorConfigChange,
  defaultColor,
  children,
}: ColorConfigContextProviderProps) {
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
  const [currentGroupByMap, setCurrentGroupByMap] = useState<string | null>(
    isGroupByConfig(colorConfig) && colorConfig.groupBy.map !== undefined
      ? colorConfig.groupBy.map
      : null,
  );
  const [currentGroupByPalette, setCurrentGroupByPalette] = useState<
    string | null
  >(
    isGroupByConfig(colorConfig) && colorConfig.groupBy.palette !== undefined
      ? colorConfig.groupBy.palette
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
      currentConstantValue !== null &&
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
      (currentGroupByMap !== null || currentGroupByPalette !== null) &&
      // ...and different from active config
      (activeSource !== "groupBy" ||
        !isGroupByConfig(colorConfig) ||
        colorConfig.groupBy.table !== currentGroupByTable ||
        colorConfig.groupBy.column !== currentGroupByColumn ||
        colorConfig.groupBy.map !== (currentGroupByMap ?? undefined) ||
        colorConfig.groupBy.palette !== (currentGroupByPalette ?? undefined))
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
          column: currentGroupByColumn,
          map: currentGroupByMap ?? undefined,
          palette: currentGroupByPalette ?? undefined,
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
    activeSource,
    colorConfig,
    currentSource,
    currentConstantValue,
    currentFromTable,
    currentFromColumn,
    currentFromRangeMin,
    currentFromRangeMax,
    currentFromPalette,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    currentGroupByPalette,
    currentRandomPalette,
    onColorConfigChange,
  ]);

  return (
    <ColorConfigContext.Provider
      value={{
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
        currentGroupByMap,
        currentGroupByPalette,
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
        setCurrentGroupByMap,
        setCurrentGroupByPalette,
        setCurrentRandomPalette,
      }}
    >
      {children}
    </ColorConfigContext.Provider>
  );
}
