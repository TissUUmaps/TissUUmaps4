import { createContext, useContext } from "react";

import { type Color, type ColorConfig, type ValueMap } from "@tissuumaps/core";

type ColorConfigSource = Exclude<ColorConfig["source"], undefined>;

interface ColorControlContextValue {
  currentSource: ColorConfigSource;
  currentValue: Color | undefined;
  currentFromTable: string | undefined;
  currentFromColumn: string | undefined;
  currentFromRangeMin: number | undefined;
  currentFromRangeMax: number | undefined;
  currentFromPalette: string | undefined;
  currentGroupByTable: string | undefined;
  currentGroupByColumn: string | undefined;
  currentGroupByProjectMap: string | undefined;
  currentGroupByMap: ValueMap<Color> | undefined;
  currentRandomPalette: string | undefined;
  setCurrentSource: (newCurrentSource: ColorConfigSource) => void;
  setCurrentValue: (newCurrentValue: Color) => void;
  setCurrentFromTable: (newCurrentFromTable: string) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string) => void;
  setCurrentFromRangeMin: (newCurrentFromRangeMin: number | undefined) => void;
  setCurrentFromRangeMax: (newCurrentFromRangeMax: number | undefined) => void;
  setCurrentFromPalette: (newCurrentFromPalette: string) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string) => void;
  setCurrentGroupByProjectMap: (
    newCurrentGroupByProjectMap: string | undefined,
  ) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: ValueMap<Color>) => void;
  setCurrentRandomPalette: (newCurrentRandomPalette: string) => void;
}

export const ColorControlContext =
  createContext<ColorControlContextValue | null>(null);

export function useColorControlContext(): ColorControlContextValue {
  const context = useContext(ColorControlContext);
  if (!context) {
    throw new Error("ColorControl must be used within a ColorControlProvider");
  }
  return context;
}
