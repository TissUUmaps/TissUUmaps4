import { type Marker, type MarkerConfig } from "@tissuumaps/core";

export type MarkerConfigSource = Exclude<MarkerConfig["source"], undefined>;

export type MarkerConfigWidgetAdapter = {
  markerConfig: MarkerConfig;
  defaultMarker: Marker;
  tableId: string | null;
  activeSource: MarkerConfigSource;
  currentSource: MarkerConfigSource;
  currentConstantValue: Marker;
  currentFromColumn: string | null;
  currentGroupByColumn: string | null;
  currentGroupByMap: string | null;
  setCurrentSource: (newCurrentSource: MarkerConfigSource) => void;
  setCurrentConstantValue: (newCurrentValue: Marker) => void;
  setCurrentFromColumn: (newCurrentFromColumn: string | null) => void;
  setCurrentGroupByColumn: (newCurrentGroupByColumn: string | null) => void;
  setCurrentGroupByMap: (newCurrentGroupByMap: string | null) => void;
};
