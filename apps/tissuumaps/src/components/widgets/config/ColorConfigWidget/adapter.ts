import { type Color, type ColorConfig } from "@tissuumaps/core";

export type ColorConfigSource = Exclude<ColorConfig["source"], undefined>;

export type ColorConfigWidgetAdapter = {
  colorConfig: ColorConfig;
  defaultColor: Color;
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
};
