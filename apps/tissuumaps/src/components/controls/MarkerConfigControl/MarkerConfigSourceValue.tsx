import { type HTMLProps } from "react";

import {
  isConstantConfig,
  isFromConfig,
  isGroupByConfig,
} from "@tissuumaps/core";

import { useTissUUmaps } from "../../../store";
import { useMarkerConfigContext } from "./context";
import { markers } from "./markers";

export type MarkerConfigSourceValueProps = HTMLProps<HTMLDivElement>;

export function MarkerConfigSourceValue(props: MarkerConfigSourceValueProps) {
  const tables = useTissUUmaps((state) => state.tables);

  const { activeSource, markerConfig, defaultMarker } =
    useMarkerConfigContext();

  if (activeSource === "constant" && isConstantConfig(markerConfig)) {
    const markerIcon = markers.find(
      (marker) => marker.value === markerConfig.constant.value,
    )!.icon;
    return <div {...props}>{markerIcon}</div>;
  }

  if (activeSource === "from" && isFromConfig(markerConfig)) {
    const tableName =
      tables.find((table) => table.id === markerConfig.from.table)?.name ??
      markerConfig.from.table;
    return (
      <div {...props}>
        {tableName} ({markerConfig.from.column})
      </div>
    );
  }

  if (activeSource === "groupBy" && isGroupByConfig(markerConfig)) {
    const tableName =
      tables.find((table) => table.id === markerConfig.groupBy.table)?.name ??
      markerConfig.groupBy.table;
    return (
      <div {...props}>
        {tableName} ({markerConfig.groupBy.column})
      </div>
    );
  }

  const markerIcon = markers.find(
    (marker) => marker.value === defaultMarker,
  )!.icon;
  return <div {...props}>{markerIcon}</div>;
}
