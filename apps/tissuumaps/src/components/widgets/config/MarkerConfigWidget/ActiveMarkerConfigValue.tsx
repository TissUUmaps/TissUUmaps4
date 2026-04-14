import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { markers } from "@/components/markers";
import { useTissUUmaps } from "@/store";

import { type MarkerConfigWidgetAdapter } from "./adapter";

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
    const marker =
      markers.find((marker) => marker.value === markerConfig.constant.value) ??
      markers.find((marker) => marker.value === defaultMarker)!;
    return <div className={className}>{marker.icon}</div>;
  }

  if (activeSource === "from" && isFromConfig(markerConfig)) {
    const table = tables.find((t) => t.id === markerConfig.from.table);
    const tableName =
      table !== undefined ? table.name : markerConfig.from.table;
    return (
      <div className={className}>
        {tableName} ({markerConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(markerConfig)) {
    const table = tables.find((t) => t.id === markerConfig.groupBy.table);
    const tableName =
      table !== undefined ? table.name : markerConfig.groupBy.table;
    return (
      <div className={className}>
        {tableName} ({markerConfig.groupBy.column})
      </div>
    );
  }

  const marker = markers.find((marker) => marker.value === defaultMarker)!;
  return <div className={className}>{marker.icon}</div>;
}
