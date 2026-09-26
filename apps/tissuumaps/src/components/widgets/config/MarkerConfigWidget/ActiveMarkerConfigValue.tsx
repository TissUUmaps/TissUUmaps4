import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { markers } from "@/components/markers";
import { formatTableColumnQuery } from "@/components/widgets/TableColumnInput/columnQuery";
import { useProjectStore } from "@/stores/project";

import type { MarkerConfigWidgetAdapter } from "./adapter";

export type ActiveMarkerConfigValueProps = {
  adapter: MarkerConfigWidgetAdapter;
  className?: string;
};

export function ActiveMarkerConfigValue({
  adapter,
  className,
}: ActiveMarkerConfigValueProps) {
  const { activeSource, markerConfig, defaultMarker, tableId } = adapter;

  const tables = useProjectStore((state) => state.tables);

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
    return (
      <div className={className}>
        {formatTableColumnQuery(markerConfig.from, tables)}
      </div>
    );
  }

  if (
    activeSource === "groupBy" &&
    isGroupByConfig(markerConfig) &&
    tableId !== null
  ) {
    return (
      <div className={className}>
        {formatTableColumnQuery(markerConfig.groupBy, tables)}
      </div>
    );
  }

  const marker = markers.find((marker) => marker.value === defaultMarker)!;
  return <div className={className}>{marker.icon}</div>;
}
