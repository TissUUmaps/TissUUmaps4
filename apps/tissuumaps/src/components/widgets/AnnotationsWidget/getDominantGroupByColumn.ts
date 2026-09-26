import { type Config, ConfigUtils } from "@tissuumaps/core";

/**
 * Returns the table column that most of the given configurations group by
 *
 * @param configs - Property configurations, in order of priority
 * @returns The column, or `null` if no configuration groups by one
 */
export function getDominantGroupByColumn(
  configs: Config<string>[],
): string | null {
  const counts = new Map<string, number>();
  for (const config of configs) {
    const column = ConfigUtils.getGroupByColumn(config);
    if (column !== undefined) {
      counts.set(column, (counts.get(column) ?? 0) + 1);
    }
  }
  let bestColumn: string | null = null;
  let bestCount = 0;
  // the insertion order of the counts is the priority order of the configs
  for (const [column, count] of counts) {
    if (count > bestCount) {
      bestColumn = column;
      bestCount = count;
    }
  }
  return bestColumn;
}
