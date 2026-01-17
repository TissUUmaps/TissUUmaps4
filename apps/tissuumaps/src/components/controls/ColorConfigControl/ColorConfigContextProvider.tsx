import { type ReactNode, useEffect, useState } from "react";

import {
  type Color,
  type ColorConfig,
  type ValueMap,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
  isValueConfig,
} from "@tissuumaps/core";

import { ColorConfigContext } from "./context";

type ColorConfigSource = Exclude<ColorConfig["source"], undefined>;

export function ColorConfigContextProvider({
  colorConfig,
  onColorConfigChange,
  defaultColorConfigSource,
  children,
}: {
  colorConfig: ColorConfig;
  onColorConfigChange: (newColorConfig: ColorConfig) => void;
  defaultColorConfigSource: ColorConfigSource;
  children: ReactNode;
}) {
  const [currentSource, setCurrentSource] = useState<ColorConfigSource>(
    colorConfig.source ?? defaultColorConfigSource,
  );

  const [currentValue, setCurrentValue] = useState<Color | undefined>(
    isValueConfig(colorConfig) ? colorConfig.value : undefined,
  );

  const [currentFromTable, setCurrentFromTable] = useState<string | undefined>(
    isFromConfig(colorConfig) ? colorConfig.from.table : undefined,
  );
  const [currentFromColumn, setCurrentFromColumn] = useState<
    string | undefined
  >(isFromConfig(colorConfig) ? colorConfig.from.column : undefined);
  const [currentFromRangeMin, setCurrentFromRangeMin] = useState<
    number | undefined
  >(isFromConfig(colorConfig) ? colorConfig.from.range?.[0] : undefined);

  const [currentFromRangeMax, setCurrentFromRangeMax] = useState<
    number | undefined
  >(isFromConfig(colorConfig) ? colorConfig.from.range?.[1] : undefined);
  const [currentFromPalette, setCurrentFromPalette] = useState<
    string | undefined
  >(isFromConfig(colorConfig) ? colorConfig.from.palette : undefined);

  const [currentGroupByTable, setCurrentGroupByTable] = useState<
    string | undefined
  >(isGroupByConfig(colorConfig) ? colorConfig.groupBy.table : undefined);
  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | undefined
  >(isGroupByConfig(colorConfig) ? colorConfig.groupBy.column : undefined);
  const [currentGroupByProjectMap, setCurrentGroupByProjectMap] = useState<
    string | undefined
  >(isGroupByConfig(colorConfig) ? colorConfig.groupBy.projectMap : undefined);
  const [currentGroupByMap, setCurrentGroupByMap] = useState<
    ValueMap<Color> | undefined
  >(isGroupByConfig(colorConfig) ? colorConfig.groupBy.map : undefined);

  const [currentRandomPalette, setCurrentRandomPalette] = useState<
    string | undefined
  >(isRandomConfig(colorConfig) ? colorConfig.random.palette : undefined);

  useEffect(() => {
    if (
      // value is complete...
      currentSource === "value" &&
      currentValue !== undefined &&
      // ...and different from current config
      (!isValueConfig(colorConfig) || colorConfig.value !== currentValue)
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "value",
        value: currentValue,
      });
    } else if (
      // from is complete...
      currentSource === "from" &&
      currentFromTable !== undefined &&
      currentFromColumn !== undefined &&
      currentFromPalette !== undefined &&
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
      currentGroupByTable !== undefined &&
      currentGroupByColumn !== undefined &&
      currentGroupByProjectMap !== undefined &&
      currentGroupByMap !== undefined &&
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
      currentRandomPalette !== undefined &&
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
    currentValue,
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
        currentValue,
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
        setCurrentValue,
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
