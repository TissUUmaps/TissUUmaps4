import type { OpacityConfig } from "@tissuumaps/core";

export type OpacityConfigSource = Exclude<OpacityConfig["source"], undefined>;

export type OpacityConfigWidgetAdapter = {
  opacityConfig: OpacityConfig;
  defaultOpacity: number;
  tableId: string | null;
  activeSource: OpacityConfigSource;
  currentSource: OpacityConfigSource;
  currentConstantValue: number;
  currentFromColumn: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  setCurrentSource: (newCurrentSource: OpacityConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: number) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
};
