import { useMemo } from "react";

import {
  type Marker,
  type MarkerConfig,
  markerPalette,
} from "@tissuumaps/core";

import { useProjectStore } from "@/stores/project";

import { type GroupValuesAdapter, groupColumnSize } from "./adapter";
import { GroupMarkerCell } from "./cells/GroupMarkerCell";

/** Returns the group table adapter of the marker maps */
export function useMarkerGroupValues(): GroupValuesAdapter<
  Marker,
  MarkerConfig
> {
  const maps = useProjectStore((state) => state.markerMaps);
  const addMap = useProjectStore((state) => state.addMarkerMap);
  const updateMap = useProjectStore((state) => state.updateMarkerMap);
  return useMemo(
    () => ({
      maps,
      addMap,
      updateMap,
      cell: {
        size: groupColumnSize,
        getSortValue: (marker) => marker,
        render: (marker, onMarkerChange) => (
          <GroupMarkerCell marker={marker} onMarkerChange={onMarkerChange} />
        ),
      },
      getPalette: () => markerPalette,
    }),
    [maps, addMap, updateMap],
  );
}
