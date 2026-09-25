import {
  type Config,
  type GroupByConfig,
  getActiveConfigSource,
  isGroupByConfig,
} from "../model/configs";
import type { GroupValueMap } from "../model/primitives";
import { HashUtils } from "./HashUtils";

/** Utility methods for resolving the values of property configurations */
export class ConfigUtils {
  /**
   * Returns the group-to-value map that a configuration resolves its values
   * from, if any
   *
   * Only an active `groupBy` source (see {@link getActiveConfigSource}) with a
   * map ID resolves from a map. The map is returned as found in `maps`, rather
   * than copied: maps are never mutated, as an edit replaces the map, so
   * callers can detect an edit by comparing the returned maps by identity.
   *
   * @param config - The configuration
   * @param maps - The project-global maps to look the referenced map up in
   * @returns The map, or `undefined` if the configuration does not resolve
   * from a map, or if the map it references does not exist
   */
  static findGroupByMap<TValue>(
    config: Config<string>,
    maps: GroupValueMap<TValue>[],
  ): GroupValueMap<TValue> | undefined {
    if (
      getActiveConfigSource(config) === "groupBy" &&
      isGroupByConfig<false>(config) &&
      config.groupBy.map !== undefined
    ) {
      return maps.find((map) => map.id === config.groupBy.map);
    }
    return undefined;
  }

  /**
   * Creates the function that returns the value a group-by configuration
   * assigns to a group
   *
   * With a map, a group takes its value in the map, else the map's default,
   * else `defaultValue`; a map that does not exist gives every group
   * `defaultValue`. Without a map, a group takes the palette value its name
   * hashes to, or `defaultValue` if there is no palette.
   *
   * @param config - The group-by configuration
   * @param maps - The project-global maps to look the referenced map up in
   * @param defaultValue - The value of a group that nothing assigns one to
   * @param palette - The values to pick from by hash if there is no map
   * @returns The value of a group, by group name (the cell value as a string)
   */
  static createGroupValueGetter<TValue>(
    config: GroupByConfig<false>,
    maps: GroupValueMap<TValue>[],
    defaultValue: TValue,
    palette?: readonly TValue[],
  ): (group: string) => TValue {
    if (config.groupBy.map !== undefined) {
      const map = maps.find((map) => map.id === config.groupBy.map);
      if (map === undefined) {
        return () => defaultValue;
      }
      const values = new Map(Object.entries(map.values));
      const mapDefault = map.default ?? defaultValue;
      return (group) => values.get(group) ?? mapDefault;
    }
    if (palette === undefined || palette.length === 0) {
      return () => defaultValue;
    }
    return (group) => palette[HashUtils.hash(group) % palette.length]!;
  }
}
