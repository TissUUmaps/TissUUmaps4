import { createContext, useContext } from "react";

import { type SizeConfig } from "@tissuumaps/core";
import { type CoordinateSpace } from "@tissuumaps/core";

type SizeConfigSource = Exclude<SizeConfig["source"], undefined>;

interface SizeConfigContextValue {
  activeSource: SizeConfigSource;
  currentSource: SizeConfigSource;
  currentConstantValue: number;
  currentConstantUnit: CoordinateSpace | null;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentFromUnit: CoordinateSpace | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  currentGroupByUnit: CoordinateSpace | null;
  setCurrentSource: (newCurrentSource: SizeConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: number) => void;
  setCurrentConstantUnit: (
    newCurrentConstantUnit: CoordinateSpace | null,
  ) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentFromUnit: (newCurrentFromUnit: CoordinateSpace | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
  setCurrentGroupByUnit: (
    newCurrentGroupByUnit: CoordinateSpace | null,
  ) => void;
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
