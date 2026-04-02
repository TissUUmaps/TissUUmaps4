import { type OpacityConfig } from "@tissuumaps/core";

export type OpacityConfigSource = Exclude<OpacityConfig["source"], undefined>;

export type OpacityConfigWidgetAdapter = {
  opacityConfig: OpacityConfig;
  defaultOpacity: number;
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
};
