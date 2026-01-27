import { type ReactNode, useEffect, useState } from "react";

import {
  type SizeConfig,
  type ValueMap,
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";
import { type CoordinateSpace } from "@tissuumaps/core";

import { SizeConfigContext } from "./context";

type SizeConfigSource = Exclude<SizeConfig["source"], undefined>;

export type SizeConfigContextProviderProps = {
  sizeConfig: SizeConfig;
  onSizeConfigChange: (newSizeConfig: SizeConfig) => void;
  defaultSizeConfigSource: SizeConfigSource;
  children: ReactNode;
};

export function SizeConfigContextProvider({
  sizeConfig,
  onSizeConfigChange,
  defaultSizeConfigSource,
  children,
}: SizeConfigContextProviderProps) {
  const [currentSource, setCurrentSource] = useState<SizeConfigSource>(
    sizeConfig.source ?? defaultSizeConfigSource,
  );

  const [currentConstantValue, setCurrentConstantValue] = useState<
    number | null
  >(isConstantConfig(sizeConfig) ? sizeConfig.constant.value : null);

  const [currentFromTable, setCurrentFromTable] = useState<string | null>(
    isFromConfig(sizeConfig) ? sizeConfig.from.table : null,
  );
  const [currentFromColumn, setCurrentFromColumn] = useState<string | null>(
    isFromConfig(sizeConfig) ? sizeConfig.from.column : null,
  );

  const [currentGroupByTable, setCurrentGroupByTable] = useState<string | null>(
    isGroupByConfig(sizeConfig) ? sizeConfig.groupBy.table : null,
  );
  const [currentGroupByColumn, setCurrentGroupByColumn] = useState<
    string | null
  >(isGroupByConfig(sizeConfig) ? sizeConfig.groupBy.column : null);
  const [currentGroupByProjectMap, setCurrentGroupByProjectMap] = useState<
    string | undefined | null
  >(isGroupByConfig(sizeConfig) ? sizeConfig.groupBy.projectMap : null);
  const [currentGroupByMap, setCurrentGroupByMap] = useState<
    ValueMap<number> | undefined | null
  >(isGroupByConfig(sizeConfig) ? sizeConfig.groupBy.map : null);

  const [currentUnit, setCurrentUnit] = useState<CoordinateSpace | undefined>(
    // Initialize from sizeConfig if present
    (isConstantConfig(sizeConfig) && sizeConfig.constant.unit) ||
      (isFromConfig(sizeConfig) && sizeConfig.from.unit) ||
      (isGroupByConfig(sizeConfig) && sizeConfig.groupBy.unit) ||
      undefined,
  );

  useEffect(() => {
    if (
      // constant is complete...
      currentSource === "constant" &&
      currentConstantValue !== null &&
      // ...and different from current config
      (!isConstantConfig(sizeConfig) ||
        sizeConfig.constant.value !== currentConstantValue ||
        sizeConfig.constant.unit !== currentUnit)
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "constant",
        constant: { value: currentConstantValue, unit: currentUnit },
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
        sizeConfig.from.unit !== currentUnit)
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "from",
        from: {
          table: currentFromTable,
          column: currentFromColumn,
          unit: currentUnit,
        },
      });
    } else if (
      // groupBy is complete...
      currentSource === "groupBy" &&
      currentGroupByTable !== null &&
      currentGroupByColumn !== null &&
      currentGroupByProjectMap !== null &&
      currentGroupByMap !== null &&
      // ...and different from current config
      (!isGroupByConfig(sizeConfig) ||
        sizeConfig.groupBy.table !== currentGroupByTable ||
        sizeConfig.groupBy.column !== currentGroupByColumn ||
        sizeConfig.groupBy.projectMap !== currentGroupByProjectMap ||
        sizeConfig.groupBy.map !== currentGroupByMap ||
        sizeConfig.groupBy.unit !== currentUnit)
    ) {
      onSizeConfigChange({
        ...sizeConfig,
        source: "groupBy",
        groupBy: {
          table: currentGroupByTable,
          column: currentGroupByColumn,
          projectMap: currentGroupByProjectMap,
          map: currentGroupByMap,
          unit: currentUnit,
        },
      });
    }
  }, [
    sizeConfig,
    currentSource,
    currentConstantValue,
    currentFromTable,
    currentFromColumn,
    currentGroupByTable,
    currentGroupByColumn,
    currentGroupByProjectMap,
    currentGroupByMap,
    currentUnit,
    onSizeConfigChange,
  ]);

  return (
    <SizeConfigContext.Provider
      value={{
        currentSource,
        currentConstantValue: currentConstantValue,
        currentFromTable,
        currentFromColumn,
        currentGroupByTable,
        currentGroupByColumn,
        currentGroupByProjectMap,
        currentGroupByMap,
        currentUnit,
        setCurrentSource,
        setCurrentConstantValue: setCurrentConstantValue,
        setCurrentFromTable,
        setCurrentFromColumn,
        setCurrentGroupByTable,
        setCurrentGroupByColumn,
        setCurrentGroupByProjectMap,
        setCurrentGroupByMap,
        setCurrentUnit,
      }}
    >
      {children}
    </SizeConfigContext.Provider>
  );
}
