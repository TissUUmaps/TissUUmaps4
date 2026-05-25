import { type CoordinateSpace, type SizeConfig } from "@tissuumaps/core";

export type SizeConfigSource = Exclude<SizeConfig["source"], undefined>;

export type SizeConfigWidgetAdapter = {
  sizeConfig: SizeConfig;
  defaultSize: number;
  defaultSizeUnit: CoordinateSpace;
  tableId: string | null;
  activeSource: SizeConfigSource;
  currentSource: SizeConfigSource;
  currentConstantValue: number;
  currentConstantUnit: CoordinateSpace;
  currentFromColumn: string | null;
  currentFromUnit: CoordinateSpace;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  currentGroupByUnit: CoordinateSpace;
  setCurrentSource: (newCurrentSource: SizeConfigSource) => void;
  setCurrentConstantValue: (newCurrentConstantValue: number) => void;
  setCurrentConstantUnit: (newCurrentConstantUnit: CoordinateSpace) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentFromUnit: (newCurrentFromUnit: CoordinateSpace) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
  setCurrentGroupByUnit: (newCurrentGroupByUnit: CoordinateSpace) => void;
};
