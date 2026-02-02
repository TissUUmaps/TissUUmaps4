import { createContext, useContext } from "react";

import { type Color, type ColorConfig } from "@tissuumaps/core";

type ColorConfigSource = Exclude<ColorConfig["source"], undefined>;

interface ColorConfigContextValue {
  activeSource: ColorConfigSource;
  currentSource: ColorConfigSource;
  currentConstantValue: Color;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentFromRangeMin: number | null;
  currentFromRangeMax: number | null;
  currentFromPalette: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByPalette: string | null;
  currentGroupByMap: string | null;
  currentRandomPalette: string | null;
  setCurrentSource: (newCurrentSource: ColorConfigSource) => void;
  setCurrentConstantValue: (newCurrentValue: Color) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentFromRangeMin: (newCurrentFromRangeMin: number | null) => void;
  setCurrentFromRangeMax: (newCurrentFromRangeMax: number | null) => void;
  setCurrentFromPalette: (newCurrentFromPalette: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByPalette: (newCurrentGroupByPalette: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
  setCurrentRandomPalette: (newCurrentRandomPalette: string | null) => void;
}

export const ColorConfigContext = createContext<ColorConfigContextValue | null>(
  null,
);

export function useColorConfigContext(): ColorConfigContextValue {
  const context = useContext(ColorConfigContext);
  if (!context) {
    throw new Error(
      "ColorConfigControl must be used within a ColorConfigContextProvider",
    );
  }
  return context;
}
