import { deepEqual } from "fast-equals";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  type Color,
  type ColorConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
  isRandomConfig,
} from "@tissuumaps/core";

import { useTableData } from "@/hooks/useData";

import type { ColorConfigSource, ColorConfigWidgetAdapter } from "./adapter";

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
  const [currentRandomSeed, setCurrentRandomSeed] = useState<number | null>(
    isRandomConfig(colorConfig) && colorConfig.random.seed !== undefined
      ? colorConfig.random.seed
      : null,
  );

  // min/max values provided by the config or entered by the user must not be
  // overwritten by the table column's value range
  const currentFromRangeMinEditedRef = useRef(currentFromRangeMin !== null);
  const currentFromRangeMaxEditedRef = useRef(currentFromRangeMax !== null);
  const setEditedCurrentFromRangeMin = useCallback(
    (newCurrentFromRangeMin: number | null) => {
      currentFromRangeMinEditedRef.current = true;
      setCurrentFromRangeMin(newCurrentFromRangeMin);
    },
    [],
  );
  const setEditedCurrentFromRangeMax = useCallback(
    (newCurrentFromRangeMax: number | null) => {
      currentFromRangeMaxEditedRef.current = true;
      setCurrentFromRangeMax(newCurrentFromRangeMax);
    },
    [],
  );

  const tableData = useTableData(tableId);
  useEffect(() => {
    if (
      currentSource === "from" &&
      currentFromColumn !== null &&
      tableData !== null
    ) {
      const abortController = new AbortController();
      tableData
        .loadValueRange(currentFromColumn, { signal: abortController.signal })
        .then((valueRange) => {
          if (!abortController.signal.aborted && valueRange !== undefined) {
            if (!currentFromRangeMinEditedRef.current) {
              setCurrentFromRangeMin(valueRange[0]);
            }
            if (!currentFromRangeMaxEditedRef.current) {
              setCurrentFromRangeMax(valueRange[1]);
            }
          }
        })
        .catch((error) => {
          if (!abortController.signal.aborted) {
            console.error("Error loading table value range", error);
          }
        });
      return () => abortController.abort();
    }
  }, [tableData, currentSource, currentFromColumn]);

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
        colorConfig.random.palette !== currentRandomPalette ||
        colorConfig.random.seed !== (currentRandomSeed ?? undefined))
    ) {
      onColorConfigChange({
        ...colorConfig,
        source: "random",
        random: {
          palette: currentRandomPalette,
          seed: currentRandomSeed ?? undefined,
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
    currentRandomSeed,
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
    currentRandomSeed,
    setCurrentSource,
    setCurrentConstantValue,
    setCurrentFromColumn,
    setCurrentFromRangeMin: setEditedCurrentFromRangeMin,
    setCurrentFromRangeMax: setEditedCurrentFromRangeMax,
    setCurrentFromPalette,
    setCurrentGroupByColumn,
    setCurrentGroupByPalette,
    setCurrentGroupByMap,
    setCurrentRandomPalette,
    setCurrentRandomSeed,
  };
}
