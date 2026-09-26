import { useMemo } from "react";

import { type Config, ConfigUtils, type Project } from "@tissuumaps/core";

import { useProjectStore } from "@/stores/project";

/**
 * The data objects whose configurations can refer to a map
 *
 * Only these three lists, so that {@link useReferencedMapIds} does not
 * re-render its component on every other project change.
 */
export type MapReferencingObjects = Pick<
  Project,
  "labels" | "points" | "shapes"
>;

/**
 * Collects the IDs of the maps that some of the project's configurations refer
 * to
 *
 * @param getConfigs - Returns the configurations to check
 * @returns The IDs of the maps that the configurations refer to
 */
export function useReferencedMapIds(
  getConfigs: (objects: MapReferencingObjects) => Config<string>[],
): Set<string> {
  const labels = useProjectStore((state) => state.labels);
  const points = useProjectStore((state) => state.points);
  const shapes = useProjectStore((state) => state.shapes);
  return useMemo(
    () => ConfigUtils.getGroupByMapIds(getConfigs({ labels, points, shapes })),
    [getConfigs, labels, points, shapes],
  );
}
