import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { markers } from "@/components/markers";

import { type MarkerConfigWidgetAdapter } from "./adapter";

export type ActiveMarkerConfigValueProps = {
  adapter: MarkerConfigWidgetAdapter;
  className?: string;
};

export function ActiveMarkerConfigValue({
  adapter,
  className,
}: ActiveMarkerConfigValueProps) {
  const { activeSource, markerConfig, defaultMarker, tableId } = adapter;

  if (activeSource === "constant" && isConstantConfig(markerConfig)) {
    const marker =
      markers.find((marker) => marker.value === markerConfig.constant.value) ??
      markers.find((marker) => marker.value === defaultMarker)!;
    return <div className={className}>{marker.icon}</div>;
  }

  if (
    activeSource === "from" &&
    isFromConfig(markerConfig) &&
    tableId !== null
  ) {
    return <div className={className}>{markerConfig.from.column}</div>;
  }

  if (
    activeSource === "groupBy" &&
    isGroupByConfig(markerConfig) &&
    tableId !== null
  ) {
    return <div className={className}>{markerConfig.groupBy.column}</div>;
  }

  const marker = markers.find((marker) => marker.value === defaultMarker)!;
  return <div className={className}>{marker.icon}</div>;
}
