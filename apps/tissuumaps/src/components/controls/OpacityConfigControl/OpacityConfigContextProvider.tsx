import { type ReactNode, useEffect, useState } from "react";

import {
  type OpacityConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { OpacityConfigContext } from "./context";

type OpacityConfigSource = Exclude<OpacityConfig["source"], undefined>;

export type OpacityConfigContextProviderProps = {
  opacityConfig: OpacityConfig;
  onOpacityConfigChange: (newOpacityConfig: OpacityConfig) => void;
  defaultOpacity: number;
  children: ReactNode;
};

export function OpacityConfigContextProvider({
  opacityConfig,
  onOpacityConfigChange,
  defaultOpacity,
  children,
}: OpacityConfigContextProviderProps) {
  const activeSource = getActiveConfigSource(opacityConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<OpacityConfigSource>(
    opacityConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<number>(
    isConstantConfig(opacityConfig)
      ? opacityConfig.constant.value
      : defaultOpacity,
  );

  const [currentFromTable, setCurrentFromTable] = useState<string | null>(
    isFromConfig(opacityConfig) ? opacityConfig.from.table : null,
  );
  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(opacityConfig) ? opacityConfig.from.column : null,
  );

  const [currentGroupByTable, setCurrentGroupByTable] = useState<string | null>(
    isGroupByConfig(opacityConfig) ? opacityConfig.groupBy.table : null,
  );
  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | null
  >(isGroupByConfig(opacityConfig) ? opacityConfig.groupBy.column : null);
  const [currentGroupByMap, setCurrentGroupByMap] = useState<string | null>(
    isGroupByConfig(opacityConfig) && opacityConfig.groupBy.map !== undefined
      ? opacityConfig.groupBy.map
      : null,
  );

  useEffect(() => {
    if (
      // constant is complete...
      currentSource === "constant" &&
      // ...and different from active config
      (activeSource !== "constant" ||
        !isConstantConfig(opacityConfig) ||
        opacityConfig.constant.value !== currentConstantValue)
    ) {
      onOpacityConfigChange({
        ...opacityConfig,
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
        !isFromConfig(opacityConfig) ||
        opacityConfig.from.table !== currentFromTable ||
        opacityConfig.from.column !== currentFromColumn)
    ) {
      onOpacityConfigChange({
        ...opacityConfig,
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
        !isGroupByConfig(opacityConfig) ||
        opacityConfig.groupBy.table !== currentGroupByTable ||
        opacityConfig.groupBy.column !== currentGroupByColumn ||
        opacityConfig.groupBy.map !== currentGroupByMap)
    ) {
      onOpacityConfigChange({
        ...opacityConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
          column: currentGroupByColumn,
          map: currentGroupByMap,
        },
      });
    }
  }, [
    opacityConfig,
    activeSource,
    currentSource,
    currentConstantValue,
    currentFromTable,
    currentFromColumn,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByMap,
    onOpacityConfigChange,
  ]);

  return (
    <OpacityConfigContext.Provider
      value={{
        opacityConfig,
        defaultOpacity,
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
      }}
    >
      {children}
    </OpacityConfigContext.Provider>
  );
}
