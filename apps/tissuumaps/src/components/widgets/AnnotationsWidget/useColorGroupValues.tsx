import { useMemo } from "react";

import {
  type Color,
  type ColorConfig,
  findColorPalette,
} from "@tissuumaps/core";

import { useProjectStore } from "@/stores/project";

import { type GroupValuesAdapter, groupColumnSize } from "./adapter";
import { GroupColorCell } from "./cells/GroupColorCell";

/** Returns the group table adapter of the color maps */
export function useColorGroupValues(): GroupValuesAdapter<Color, ColorConfig> {
  const maps = useProjectStore((state) => state.colorMaps);
  const addMap = useProjectStore((state) => state.addColorMap);
  const updateMap = useProjectStore((state) => state.updateColorMap);
  return useMemo(
    () => ({
      maps,
      addMap,
      updateMap,
      cell: {
        size: groupColumnSize,
        render: (color, onColorChange) => (
          <GroupColorCell color={color} onColorChange={onColorChange} />
        ),
      },
      getPalette: (config) => findColorPalette(config.groupBy.palette)?.colors,
    }),
    [maps, addMap, updateMap],
  );
}
