import { describe, expect, it } from "vitest";

import MapUtils from "./MapUtils";

describe("MapUtils", () => {
  describe("map", () => {
    it("should map over a Map and return an array of results", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const result = MapUtils.map(
        map,
        (key, value, index) => `${index}:${key}-${value}`,
      );
      expect(result).toEqual(["0:a-1", "1:b-2"]);
    });

    it("should return an empty array for an empty map", () => {
      const map = new Map();
      const result = MapUtils.map(map, () => 1);
      expect(result).toEqual([]);
    });
  });

  describe("cloneAndSplice", () => {
    it("should clone and splice entries (deleteCount defined)", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]);
      const result = MapUtils.cloneAndSplice(map, 1, 1, ["x", 99]);
      expect(Array.from(result.entries())).toEqual([
        ["a", 1],
        ["x", 99],
        ["c", 3],
      ]);
    });

    it("should clone and splice entries (deleteCount undefined)", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
        ["c", 3],
      ]);
      const result = MapUtils.cloneAndSplice(map, 1);
      expect(Array.from(result.entries())).toEqual([["a", 1]]);
    });

    it("should insert multiple items", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const result = MapUtils.cloneAndSplice(map, 1, 0, ["x", 9], ["y", 8]);
      expect(Array.from(result.entries())).toEqual([
        ["a", 1],
        ["x", 9],
        ["y", 8],
        ["b", 2],
      ]);
    });
  });

  describe("cloneAndSpliceSet", () => {
    it("should set a new key-value if index is undefined", () => {
      const map = new Map([["a", 1]]);
      const result = MapUtils.cloneAndSpliceSet(map, "b", 2);
      expect(Array.from(result.entries())).toEqual([
        ["a", 1],
        ["b", 2],
      ]);
    });

    it("should insert at a specific index", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const result = MapUtils.cloneAndSpliceSet(map, "x", 99, 1);
      expect(Array.from(result.entries())).toEqual([
        ["a", 1],
        ["x", 99],
        ["b", 2],
      ]);
    });

    it("should replace existing key at index", () => {
      const map = new Map([
        ["a", 1],
        ["b", 2],
      ]);
      const result = MapUtils.cloneAndSpliceSet(map, "a", 42, 1);
      expect(Array.from(result.entries())).toEqual([
        ["b", 2],
        ["a", 42],
      ]);
    });

    it("should not mutate the original map", () => {
      const map = new Map([["a", 1]]);
      MapUtils.cloneAndSpliceSet(map, "b", 2);
      expect(Array.from(map.entries())).toEqual([["a", 1]]);
    });
  });
});
