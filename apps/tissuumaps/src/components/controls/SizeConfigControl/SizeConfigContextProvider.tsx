import { type ReactNode, useEffect, useState } from "react";

import {
  type CoordinateSpace,
  type SizeConfig,
  getActiveConfigSource,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { SizeConfigContext } from "./context";

type SizeConfigSource = Exclude<SizeConfig["source"], undefined>;

export type SizeConfigContextProviderProps = {
  sizeConfig: SizeConfig;
  onSizeConfigChange: (newSizeConfig: SizeConfig) => void;
  defaultSize: number;
  children: ReactNode;
};

export function SizeConfigContextProvider({
  sizeConfig,
  onSizeConfigChange,
  defaultSize,
  children,
}: SizeConfigContextProviderProps) {
  const activeSource = getActiveConfigSource(sizeConfig) ?? "constant";
  const [currentSource, setCurrentSource] = useState<SizeConfigSource>(
    sizeConfig.source ?? "constant",
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<number>(
    isConstantConfig(sizeConfig) ? sizeConfig.constant.value : defaultSize,
  );
  const [currentConstantUnit, setCurrentConstantUnit] =
    useState<CoordinateSpace | null>(
      isConstantConfig(sizeConfig) && sizeConfig.constant.unit !== undefined
        ? sizeConfig.constant.unit
        : null,
    );

  const [currentFromTable, setCurrentFromTable] = useState<string | null>(
    isFromConfig(sizeConfig) ? sizeConfig.from.table : null,
  );
  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(sizeConfig) ? sizeConfig.from.column : null,
  );
  const [currentFromUnit, setCurrentFromUnit] =
    useState<CoordinateSpace | null>(
      isFromConfig(sizeConfig) && sizeConfig.from.unit !== undefined
        ? sizeConfig.from.unit
        : null,
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
  const [currentGroupByUnit, setCurrentGroupByUnit] =
    useState<CoordinateSpace | null>(
      isGroupByConfig(sizeConfig) && sizeConfig.groupBy.unit !== undefined
        ? sizeConfig.groupBy.unit
        : null,
    );

  useEffect(() => {
    if (
      // constant is complete...
      currentSource === "constant" &&
      currentConstantValue !== null &&
      // ...and different from current config
      (!isConstantConfig(sizeConfig) ||
        sizeConfig.constant.value !== currentConstantValue ||
        sizeConfig.constant.unit !== (currentConstantUnit ?? undefined))
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "constant",
        constant: {
          value: currentConstantValue,
          unit: currentConstantUnit ?? undefined,
        },
      });
    } else if (
      // from is complete...
      currentSource === "from" &&
      currentFromTable !== null &&
      currentFromColumn !== null &&
      // ...and different from current config
      (!isFromConfig(sizeConfig) ||
        sizeConfig.from.table !== currentFromTable ||
        sizeConfig.from.column !== currentFromColumn ||
        sizeConfig.from.unit !== (currentFromUnit ?? undefined))
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "from",
        from: {
          table: currentFromTable,
          column: currentFromColumn,
          unit: currentFromUnit ?? undefined,
        },
      });
    } else if (
      // groupBy is complete...
      currentSource === "groupBy" &&
      currentGroupByTable !== null &&
      currentGroupByColumn !== null &&
      currentGroupByMap !== null &&
      // ...and different from current config
      (!isGroupByConfig(sizeConfig) ||
        sizeConfig.groupBy.table !== currentGroupByTable ||
        sizeConfig.groupBy.column !== currentGroupByColumn ||
        sizeConfig.groupBy.map !== currentGroupByMap ||
        sizeConfig.groupBy.unit !== (currentGroupByUnit ?? undefined))
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
          column: currentGroupByColumn,
          map: currentGroupByMap,
          unit: currentGroupByUnit ?? undefined,
        },
      });
    }
  }, [
    sizeConfig,
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

  return (
    <SizeConfigContext.Provider
      value={{
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
      }}
    >
      {children}
    </SizeConfigContext.Provider>
  );
}
