import { type ReactNode, useEffect, useState } from "react";

import {
  type Color,
  type ColorConfig,
  type ValueMap,
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
  defaultColorConfigSource: ColorConfigSource;
  children: ReactNode;
};

export function ColorConfigContextProvider({
  colorConfig,
  onColorConfigChange,
  defaultColorConfigSource,
  children,
}: ColorConfigContextProviderProps) {
  const [currentSource, setCurrentSource] = useState<ColorConfigSource>(
    colorConfig.source ?? defaultColorConfigSource,
  );

  const [currentConstantValue, setCurrentConstantValue] =
    useState<Color | null>(
      isConstantConfig(colorConfig) ? colorConfig.constant.value : null,
    );

  const [currentFromTable, setCurrentFromTable] = useState<string | null>(
    isFromConfig(colorConfig) ? colorConfig.from.table : null,
  );
  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(colorConfig) ? colorConfig.from.column : null,
  );
  const [currentFromRangeMin, setCurrentFromRangeMin] = useState<
    number | undefined | null
  >(isFromConfig(colorConfig) ? colorConfig.from.range?.[0] : null);

  const [currentFromRangeMax, setCurrentFromRangeMax] = useState<
    number | undefined | null
  >(isFromConfig(colorConfig) ? colorConfig.from.range?.[1] : null);
  const [currentFromPalette, setCurrentFromPalette] = useState<string | null>(
    isFromConfig(colorConfig) ? colorConfig.from.palette : null,
  );

  const [currentGroupByTable, setCurrentGroupByTable] = useState<string | null>(
    isGroupByConfig(colorConfig) ? colorConfig.groupBy.table : null,
  );
  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | null
  >(isGroupByConfig(colorConfig) ? colorConfig.groupBy.column : null);
  const [currentGroupByProjectMap, setCurrentGroupByProjectMap] = useState<
    string | undefined | null
  >(isGroupByConfig(colorConfig) ? colorConfig.groupBy.projectMap : null);
  const [currentGroupByMap, setCurrentGroupByMap] = useState<
    ValueMap<Color> | undefined | null
  >(isGroupByConfig(colorConfig) ? colorConfig.groupBy.map : null);

  const [currentRandomPalette, setCurrentRandomPalette] = useState<
    string | null
  >(isRandomConfig(colorConfig) ? colorConfig.random.palette : null);

  useEffect(() => {
    if (
      // constant is complete...
      currentSource === "constant" &&
      currentConstantValue !== null &&
      // ...and different from current config
      (!isConstantConfig(colorConfig) ||
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
      currentFromRangeMin !== null &&
      currentFromRangeMax !== null &&
      currentFromPalette !== null &&
      // ...and different from current config
      (!isFromConfig(colorConfig) ||
        colorConfig.from.table !== currentFromTable ||
        colorConfig.from.column !== currentFromColumn ||
        colorConfig.from.range?.[0] !== currentFromRangeMin ||
        colorConfig.from.range?.[1] !== currentFromRangeMax ||
        colorConfig.from.palette !== currentFromPalette)
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "from",
        from: {
          table: currentFromTable,
          column: currentFromColumn,
          range:
            currentFromRangeMin !== undefined &&
            currentFromRangeMax !== undefined
              ? [currentFromRangeMin, currentFromRangeMax]
              : undefined,
          palette: currentFromPalette,
        },
      });
    } else if (
      // groupBy is complete...
      currentSource === "groupBy" &&
      currentGroupByTable !== null &&
      currentGroupByColumn !== null &&
      (currentGroupByProjectMap !== null || currentGroupByMap !== null) &&
      // ...and different from current config
      (!isGroupByConfig(colorConfig) ||
        colorConfig.groupBy.table !== currentGroupByTable ||
        colorConfig.groupBy.column !== currentGroupByColumn ||
        colorConfig.groupBy.projectMap !== currentGroupByProjectMap ||
        colorConfig.groupBy.map !== currentGroupByMap)
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
          column: currentGroupByColumn,
          projectMap: currentGroupByProjectMap,
          map: currentGroupByMap,
        },
      });
    } else if (
      // random is complete...
      currentSource === "random" &&
      currentRandomPalette !== null &&
      // ...and different from current config
      (!isRandomConfig(colorConfig) ||
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
    currentSource,
    currentConstantValue,
    currentFromTable,
    currentFromColumn,
    currentFromRangeMin,
    currentFromRangeMax,
    currentFromPalette,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByProjectMap,
    currentGroupByMap,
    currentRandomPalette,
    onColorConfigChange,
  ]);

  return (
    <ColorConfigContext.Provider
      value={{
        currentSource,
        currentConstantValue: currentConstantValue,
        currentFromTable,
        currentFromColumn,
        currentFromRangeMin,
        currentFromRangeMax,
        currentFromPalette,
        currentGroupByTable,
        currentGroupByColumn,
        currentGroupByProjectMap,
        currentGroupByMap,
        currentRandomPalette,
        setCurrentSource,
        setCurrentConstantValue: setCurrentConstantValue,
        setCurrentFromTable,
        setCurrentFromColumn,
        setCurrentFromRangeMin,
        setCurrentFromRangeMax,
        setCurrentFromPalette,
        setCurrentGroupByTable,
        setCurrentGroupByColumn,
        setCurrentGroupByProjectMap,
        setCurrentGroupByMap,
        setCurrentRandomPalette,
      }}
    >
      {children}
    </ColorConfigContext.Provider>
  );
}
