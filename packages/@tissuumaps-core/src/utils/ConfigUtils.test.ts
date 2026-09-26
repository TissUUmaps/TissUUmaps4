import { describe, expect, it } from "vitest";

import type { GroupByConfig } from "../model/configs";
import type { GroupValueMap } from "../model/primitives";
import { ConfigUtils } from "./ConfigUtils";
import { HashUtils } from "./HashUtils";

describe("ConfigUtils", () => {
  describe("findGroupByMap", () => {
    const maps: GroupValueMap<number>[] = [
      { id: "map1", name: "Map 1", values: { A: 1 } },
    ];

    it("returns the map of an active group-by source as it is", () => {
      const config = { groupBy: { column: "cluster", map: "map1" } };

      expect(ConfigUtils.findGroupByMap(config, maps)).toBe(maps[0]);
    });

    it("returns undefined if group-by is not the active source", () => {
      const config = {
        source: "constant",
        constant: { value: 1 },
        groupBy: { column: "cluster", map: "map1" },
      };

      expect(ConfigUtils.findGroupByMap(config, maps)).toBeUndefined();
    });

    it("returns undefined if the map does not exist", () => {
      const config = { groupBy: { column: "cluster", map: "missing" } };

      expect(ConfigUtils.findGroupByMap(config, maps)).toBeUndefined();
    });
  });

  describe("createGroupValueGetter", () => {
    const map1: GroupValueMap<number> = {
      id: "map1",
      name: "Map 1",
      values: { A: 1 },
      default: 9,
    };
    const map2: GroupValueMap<number> = {
      id: "map2",
      name: "Map 2",
      values: { A: 1 },
    };
    const palette = [10, 20, 30];

    it("reads a group's value in the referenced map", () => {
      const config: GroupByConfig<false> = {
        groupBy: { column: "cluster", map: "map1" },
      };

      expect(
        ConfigUtils.createGroupValueGetter(config, map1, 0, palette)("A"),
      ).toBe(1);
    });

    it("falls back to the map's default, then to the default value", () => {
      const getValue = ConfigUtils.createGroupValueGetter(
        { groupBy: { column: "cluster", map: "map1" } },
        map1,
        0,
      );
      const getValueWithoutMapDefault = ConfigUtils.createGroupValueGetter(
        { groupBy: { column: "cluster", map: "map2" } },
        map2,
        0,
      );

      expect(getValue("B")).toBe(9);
      expect(getValueWithoutMapDefault("B")).toBe(0);
    });

    it("does not read inherited object properties as map values", () => {
      const getValue = ConfigUtils.createGroupValueGetter(
        { groupBy: { column: "cluster", map: "map2" } },
        map2,
        0,
      );

      expect(getValue("constructor")).toBe(0);
    });

    it("gives every group the default value if the map does not exist", () => {
      const getValue = ConfigUtils.createGroupValueGetter(
        { groupBy: { column: "cluster", map: "missing" } },
        undefined,
        0,
        palette,
      );

      expect(getValue("A")).toBe(0);
    });

    it("picks a palette value by hash without a map", () => {
      const getValue = ConfigUtils.createGroupValueGetter(
        { groupBy: { column: "cluster", map: undefined } },
        undefined,
        0,
        palette,
      );

      expect(getValue("A")).toBe(palette[HashUtils.hash("A") % palette.length]);
    });

    it("gives every group the default value without a map or palette", () => {
      const getValue = ConfigUtils.createGroupValueGetter(
        { groupBy: { column: "cluster", map: undefined } },
        undefined,
        0,
      );

      expect(getValue("A")).toBe(0);
    });
  });
});
