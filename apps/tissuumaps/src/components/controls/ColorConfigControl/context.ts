import { createContext, useContext } from "react";

import { type Color, type ColorConfig, type ValueMap } from "@tissuumaps/core";

type ColorConfigSource = Exclude<ColorConfig["source"], undefined>;

interface ColorConfigContextValue {
  currentSource: ColorConfigSource;
  currentValue: Color | null;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentFromRangeMin: number | undefined | null;
  currentFromRangeMax: number | undefined | null;
  currentFromPalette: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByProjectMap: string | undefined | null;
  currentGroupByMap: ValueMap<Color> | undefined | null;
  currentRandomPalette: string | null;
  setCurrentSource: (newCurrentSource: ColorConfigSource) => void;
  setCurrentValue: (newCurrentValue: Color | null) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentFromRangeMin: (
    newCurrentFromRangeMin: number | undefined | null,
  ) => void;
  setCurrentFromRangeMax: (
    newCurrentFromRangeMax: number | undefined | null,
  ) => void;
  setCurrentFromPalette: (newCurrentFromPalette: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByProjectMap: (
    newCurrentGroupByProjectMap: string | undefined | null,
  ) => void;
  setCurrentGroupByMap: (
    newCurrentGroupByMap: ValueMap<Color> | undefined | null,
  ) => void;
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
