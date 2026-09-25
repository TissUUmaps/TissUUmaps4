import { useMemo } from "react";

import type { VisibilityConfig } from "@tissuumaps/core";

import type { GroupVisibility } from "./GroupAnnotationsTable";
import { createGroupValues } from "./createGroupValues";
import type { GroupProperty } from "./useGroupColumn";
import type { GroupTable } from "./useGroupTable";

/**
 * Returns the eye column of the group table, showing and toggling a visibility
 * property for each group
 *
 * @param groupTable - The state of the group table
 * @param property - The visibility property
 * @returns The eye column, or `undefined` while the table has no column or
 * groups
 */
export function useGroupVisibility(
  groupTable: GroupTable,
  property: GroupProperty<boolean, VisibilityConfig>,
): GroupVisibility | undefined {
  const {
    category,
    name,
    default: defaultValue,
    config,
    onConfigChange,
    adapter,
  } = property;

  return useMemo(() => {
    const groupValues = createGroupValues(groupTable, {
      category,
      name,
      default: defaultValue,
      config,
      onConfigChange,
      adapter,
    });
    if (groupValues === undefined) {
      return undefined;
    }
    const { getValue, setValues, isInactive } = groupValues;
    return {
      isVisible: getValue,
      isInactive,
      onVisibleChange: (groups, visible) =>
        setValues(Object.fromEntries(groups.map((group) => [group, visible]))),
    };
  }, [
    groupTable,
    category,
    name,
    defaultValue,
    config,
    onConfigChange,
    adapter,
  ]);
}
