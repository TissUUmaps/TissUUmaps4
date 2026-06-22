import type { VisibilityConfig } from "@tissuumaps/core";

export type VisibilityConfigSource = Exclude<
  VisibilityConfig["source"],
  undefined
>;

export type VisibilityConfigWidgetAdapter = {
  visibilityConfig: VisibilityConfig;
  defaultVisibility: boolean;
  tableId: string | null;
  activeSource: VisibilityConfigSource;
  currentSource: VisibilityConfigSource;
  currentConstantValue: boolean;
  currentFromColumn: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  setCurrentSource: (newCurrentSource: VisibilityConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: boolean) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
};
