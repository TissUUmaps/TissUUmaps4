import { useMemo } from "react";

import type { SizeConfig } from "@tissuumaps/core";

import { useProjectStore } from "@/stores/project";

import { type GroupValuesAdapter, numericGroupColumnSize } from "./adapter";
import { GroupSizeCell } from "./cells/GroupSizeCell";

/** Returns the group table adapter of the size maps */
export function useSizeGroupValues(): GroupValuesAdapter<number, SizeConfig> {
  const maps = useProjectStore((state) => state.sizeMaps);
  const addMap = useProjectStore((state) => state.addSizeMap);
  const updateMap = useProjectStore((state) => state.updateSizeMap);
  return useMemo(
    () => ({
      maps,
      addMap,
      updateMap,
      cell: {
        size: numericGroupColumnSize,
        getSortValue: (size) => size,
        render: (size, onSizeChange) => (
          <GroupSizeCell size={size} onSizeChange={onSizeChange} />
        ),
      },
    }),
    [maps, addMap, updateMap],
  );
}
