import { type VisibilityConfig } from "@tissuumaps/core";

export type VisibilityConfigSource = Exclude<
  VisibilityConfig["source"],
  undefined
>;

export type VisibilityConfigWidgetAdapter = {
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
};
