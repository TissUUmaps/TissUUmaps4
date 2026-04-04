import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "@/store";

import { type MarkerConfigWidgetAdapter } from "./adapter";
import { markers } from "./markers";

export type ActiveMarkerConfigValueProps = {
  adapter: MarkerConfigWidgetAdapter;
  className?: string;
};

export function ActiveMarkerConfigValue({
  adapter,
  className,
}: ActiveMarkerConfigValueProps) {
  const { activeSource, markerConfig, defaultMarker } = adapter;

  const tables = useTissUUmaps((state) => state.tables);

  if (activeSource === "constant" && isConstantConfig(markerConfig)) {
    const markerIcon = markers.find(
      (marker) => marker.value === markerConfig.constant.value,
    )!.icon;
    return <div className={className}>{markerIcon}</div>;
  }

  if (activeSource === "from" && isFromConfig(markerConfig)) {
    const tableName =
      tables.find((table) => table.id === markerConfig.from.table)?.name ??
      markerConfig.from.table;
    return (
      <div className={className}>
        {tableName} ({markerConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(markerConfig)) {
    const tableName =
      tables.find((table) => table.id === markerConfig.groupBy.table)?.name ??
      markerConfig.groupBy.table;
    return (
      <div className={className}>
        {tableName} ({markerConfig.groupBy.column})
      </div>
    );
  }

  const markerIcon = markers.find(
    (marker) => marker.value === defaultMarker,
  )!.icon;
  return <div className={className}>{markerIcon}</div>;
}
