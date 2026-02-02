import { createContext, useContext } from "react";

import { Marker, type MarkerConfig } from "@tissuumaps/core";

type MarkerConfigSource = Exclude<MarkerConfig["source"], undefined>;

interface MarkerConfigContextValue {
  activeSource: MarkerConfigSource;
  currentSource: MarkerConfigSource;
  currentConstantValue: Marker;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  setCurrentSource: (newCurrentSource: MarkerConfigSource) => void;
  setCurrentConstantValue: (newCurrentValue: Marker) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
}

export const MarkerConfigContext =
  createContext<MarkerConfigContextValue | null>(null);

export function useMarkerConfigContext(): MarkerConfigContextValue {
  const context = useContext(MarkerConfigContext);
  if (!context) {
    throw new Error("MarkerConfig context not found");
  }
  return context;
}
