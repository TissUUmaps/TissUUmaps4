import { type Marker, type MarkerConfig } from "@tissuumaps/core";

export type MarkerConfigSource = Exclude<MarkerConfig["source"], undefined>;

export type MarkerConfigWidgetAdapter = {
  markerConfig: MarkerConfig;
  defaultMarker: Marker;
  activeSource: MarkerConfigSource;
  currentSource: MarkerConfigSource;
  currentConstantValue: Marker;
  currentFromTable: string | null;
  currentFromColumn: string | null;
  currentGroupByTable: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  setCurrentSource: (newCurrentSource: MarkerConfigSource) => void;
  setCurrentConstantValue: (newCurrentValue: Marker) => void;
  setCurrentFromTable: (newCurrentFromTable: string | null) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByTable: (newCurrentGroupByTable: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
};
