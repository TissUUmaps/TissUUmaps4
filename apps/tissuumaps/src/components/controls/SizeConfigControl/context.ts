import { createContext, useContext } from "react";

import { type SizeConfig, type ValueMap } from "@tissuumaps/core";
import { type CoordinateSpace } from "@tissuumaps/core";

type SizeConfigSource = Exclude<SizeConfig["source"], undefined>;

interface SizeConfigContextValue {
  currentSource: SizeConfigSource;
  currentConstantValue: number | null;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByProjectMap: string | undefined | null;
  currentGroupByMap: ValueMap<number> | undefined | null;
  currentUnit?: CoordinateSpace;
  setCurrentSource: (newCurrentSource: SizeConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: number | null) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByProjectMap: (
    newCurrentGroupByProjectMap: string | undefined | null,
  ) => void;
  setCurrentGroupByMap: (
    newCurrentGroupByMap: ValueMap<number> | undefined | null,
  ) => void;
  setCurrentUnit: (unit: CoordinateSpace) => void;
}

export const SizeConfigContext = createContext<SizeConfigContextValue | null>(
  null,
);

export function useSizeConfigContext(): SizeConfigContextValue {
  const context = useContext(SizeConfigContext);
  if (!context) {
    throw new Error(
      "SizeConfigControl must be used within a SizeConfigContextProvider",
    );
  }
  return context;
}

export type SizeConfigContextType = {
  currentSource: SizeConfigSource;
  currentConstantValue: number | null;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByProjectMap: string | undefined | null;
  currentGroupByMap: ValueMap<number> | undefined | null;
  currentUnit?: CoordinateSpace;
  setCurrentSource: (newCurrentSource: SizeConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: number | null) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByProjectMap: (
    newCurrentGroupByProjectMap: string | undefined | null,
  ) => void;
  setCurrentGroupByMap: (
    newCurrentGroupByMap: ValueMap<number> | undefined | null,
  ) => void;
  setCurrentUnit: (unit: CoordinateSpace) => void;
};
