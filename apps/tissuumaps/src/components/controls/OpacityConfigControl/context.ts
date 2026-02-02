import { createContext, useContext } from "react";

import { type OpacityConfig } from "@tissuumaps/core";

type OpacityConfigSource = Exclude<OpacityConfig["source"], undefined>;

interface OpacityConfigContextValue {
  activeSource: OpacityConfigSource;
  currentSource: OpacityConfigSource;
  currentConstantValue: number;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  setCurrentSource: (newCurrentSource: OpacityConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: number) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
}

export const OpacityConfigContext =
  createContext<OpacityConfigContextValue | null>(null);

export function useOpacityConfigContext(): OpacityConfigContextValue {
  const context = useContext(OpacityConfigContext);
  if (!context) {
    throw new Error("OpacityConfig context not found");
  }
  return context;
}
