import { useMemo } from "react";

import { type Config, ConfigUtils, type GroupByConfig } from "@tissuumaps/core";

import type { GroupAnnotationsTableColumnDef } from "./GroupAnnotationsTable";
import type { GroupValuesAdapter } from "./adapter";
import type { GroupTable } from "./useGroupTable";

/** Width of a group column, in pixels */
const groupColumnSize = 60;

/** A property of an annotated object that can take a value per group */
export type GroupProperty<TValue, TConfig extends Config<string>> = {
  /** The name of the property, as a column header */
  name: string;

  /** The value of a group that nothing assigns one to */
  default: NoInfer<TValue>;

  config: NoInfer<TConfig>;

  /** The adapter of the property's value type, which also sets `TValue` */
  values: GroupValuesAdapter<TValue, TConfig>;
};

function isGroupedByColumn<TConfig extends Config<string>>(
  config: TConfig,
  column: string,
): config is Extract<TConfig, GroupByConfig<false>> {
  return ConfigUtils.getGroupByColumn(config) === column;
}

/**
 * Returns the group table column of a property, showing the value of each group
 *
 * @param table - The column that the group table groups by
 * @param property - The property
 * @returns The column, or `undefined` while the property does not group by the
 * table's column
 */
export function useGroupColumn<TValue, TConfig extends Config<string>>(
  table: GroupTable,
  property: GroupProperty<TValue, TConfig>,
): GroupAnnotationsTableColumnDef | undefined {
  const { name, default: defaultValue, config, values } = property;
  const { column } = table;

  return useMemo(() => {
    if (column === null || !isGroupedByColumn(config, column)) {
      return undefined;
    }
    const getValue = ConfigUtils.createGroupValueGetter(
      config,
      ConfigUtils.findGroupByMap(config, values.maps),
      defaultValue,
      values.getPalette?.(config),
    );
    const columnDef: GroupAnnotationsTableColumnDef = {
      id: name,
      size: groupColumnSize,
      header: name,
      cell: ({ row }) => values.renderValue(getValue(row.getValue("group"))),
    };
    return columnDef;
  }, [column, name, defaultValue, config, values]);
}
