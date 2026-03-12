import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { markers } from "./markers";
import { type MarkerConfigControlState } from "./useMarkerConfigControl";

export type ActiveMarkerConfigValueProps = {
  state: MarkerConfigControlState;
  className?: string;
};

export function ActiveMarkerConfigValue({
  state,
  className,
}: ActiveMarkerConfigValueProps) {
  const tables = useTissUUmaps((state) => state.tables);

  const { activeSource, markerConfig, defaultMarker } = state;

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
