import { describe, expect, it } from "vitest";

import {
  type ConstantConfig,
  type GroupByConfig,
  getConfigUnit,
  getGroupByColumn,
  withGroupByMap,
} from "./configs";

describe("configs", () => {
  describe("withGroupByMap", () => {
    it("groups by the column with the map, keeping the other sources", () => {
      const config: ConstantConfig<boolean> = { constant: { value: false } };

      expect(withGroupByMap(config, "cluster", "map1")).toEqual({
        constant: { value: false },
        source: "groupBy",
        groupBy: { column: "cluster", map: "map1" },
      });
    });

    it("keeps the extra fields of the group-by specification", () => {
      const config: GroupByConfig<false, { palette?: string }> = {
        groupBy: { column: "gene", map: undefined, palette: "viridis" },
      };

      expect(withGroupByMap(config, "cluster", "map1")).toEqual({
        source: "groupBy",
        groupBy: { column: "cluster", map: "map1", palette: "viridis" },
      });
    });

    it("carries the unit of the active source over", () => {
      const config = {
        constant: { value: 1, unit: "data" as const },
        groupBy: { column: "cluster", map: "map1", unit: "world" as const },
      };

      expect(withGroupByMap(config, "cluster", "map2").groupBy).toEqual({
        column: "cluster",
        map: "map2",
        unit: "data",
      });
    });

    it("drops a group-by unit if the active source has none", () => {
      const config = {
        source: "constant" as const,
        constant: { value: 1 },
        groupBy: { column: "cluster", map: "map1", unit: "world" as const },
      };

      expect(
        withGroupByMap(config, "cluster", "map2").groupBy,
      ).not.toHaveProperty("unit", "world");
    });

    it("returns a configuration already grouping by the column with the map as is", () => {
      const config: GroupByConfig<true> = {
        groupBy: { column: "cluster", map: "map1" },
      };

      expect(withGroupByMap(config, "cluster", "map1")).toBe(config);
    });
  });

  describe("getGroupByColumn", () => {
    it("returns the column of an active group-by source", () => {
      expect(
        getGroupByColumn({ groupBy: { column: "cluster", map: "map1" } }),
      ).toBe("cluster");
    });

    it("returns undefined if group-by is not the active source", () => {
      expect(
        getGroupByColumn({
          source: "constant",
          constant: { value: 1 },
          groupBy: { column: "cluster", map: "map1" },
        }),
      ).toBeUndefined();
    });
  });

  describe("getConfigUnit", () => {
    it("returns the unit of the active source", () => {
      expect(
        getConfigUnit({
          source: "constant",
          constant: { value: 1, unit: "data" },
          groupBy: { column: "cluster", map: "map1", unit: "world" },
        }),
      ).toBe("data");
    });

    it("returns undefined if the active source has no unit", () => {
      expect(getConfigUnit({ constant: { value: 1 } })).toBeUndefined();
    });
  });
});
