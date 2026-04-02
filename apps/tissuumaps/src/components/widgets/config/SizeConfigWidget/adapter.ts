import { type CoordinateSpace, type SizeConfig } from "@tissuumaps/core";

export type SizeConfigSource = Exclude<SizeConfig["source"], undefined>;

export type SizeConfigWidgetAdapter = {
  sizeConfig: SizeConfig;
  defaultSize: number;
  defaultSizeUnit: CoordinateSpace;
  activeSource: SizeConfigSource;
  currentSource: SizeConfigSource;
  currentConstantValue: number;
  currentConstantUnit: CoordinateSpace;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentFromUnit: CoordinateSpace;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  currentGroupByUnit: CoordinateSpace;
  setCurrentSource: (newCurrentSource: SizeConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: number) => void;
  setCurrentConstantUnit: (newCurrentConstantUnit: CoordinateSpace) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentFromUnit: (newCurrentFromUnit: CoordinateSpace) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
  setCurrentGroupByUnit: (newCurrentGroupByUnit: CoordinateSpace) => void;
};
