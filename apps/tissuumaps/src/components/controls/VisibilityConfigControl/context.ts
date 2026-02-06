import { createContext, useContext } from "react";

import { type VisibilityConfig } from "@tissuumaps/core";

type VisibilityConfigSource = Exclude<VisibilityConfig["source"], undefined>;

interface VisibilityConfigContextValue {
  visibilityConfig: VisibilityConfig;
  defaultVisibility: boolean;
  activeSource: VisibilityConfigSource;
  currentSource: VisibilityConfigSource;
  currentConstantValue: boolean;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  setCurrentSource: (newCurrentSource: VisibilityConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: boolean) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
}

export const VisibilityConfigContext =
  createContext<VisibilityConfigContextValue | null>(null);

export function useVisibilityConfigContext(): VisibilityConfigContextValue {
  const context = useContext(VisibilityConfigContext);
  if (!context) {
    throw new Error("VisibilityConfig context not found");
  }
  return context;
}
