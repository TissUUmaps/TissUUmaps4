import { describe, expect, it } from "vitest";

import { HashUtils } from "./HashUtils";

describe("HashUtils", () => {
  describe("djb2", () => {
    it("returns 5381 for an empty string", () => {
      expect(HashUtils.djb2("")).toBe(5381);
    });

    it("returns known hash values", () => {
      expect(HashUtils.djb2("a")).toBe(177670);
      expect(HashUtils.djb2("abc")).toBe(193485963);
      expect(HashUtils.djb2("hello")).toBe(261238937);
    });

    it("is deterministic", () => {
      const str = "test-string";
      expect(HashUtils.djb2(str)).toBe(HashUtils.djb2(str));
    });

    it("produces different hashes for different strings", () => {
      expect(HashUtils.djb2("abc")).not.toBe(HashUtils.djb2("def"));
      expect(HashUtils.djb2("12345")).not.toBe(HashUtils.djb2("54321"));
    });

    it("always returns a non-negative 32-bit integer", () => {
      for (const str of ["", "hello", "你好", "a".repeat(1000), "!@#$%^&*()"]) {
        const hash = HashUtils.djb2(str);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(0xffffffff);
      }
    });

    it("defaults to seed 5381", () => {
      expect(HashUtils.djb2("abc")).toBe(HashUtils.djb2("abc", 5381));
    });

    it("yields different hashes for different seeds", () => {
      const hashes = new Set(
        [0, 1, 2, 3, 4, 5, 6, 7].map((seed) => HashUtils.djb2("abc", seed)),
      );
      expect(hashes.size).toBe(8);
    });
  });

  describe("djb2Pick", () => {
    it("returns a value from the array", () => {
      const values = ["red", "green", "blue"];
      const result = HashUtils.djb2Pick(values, "test");
      expect(values).toContain(result);
    });

    it("is deterministic", () => {
      const values = [1, 2, 3, 4, 5];
      expect(HashUtils.djb2Pick(values, "key")).toBe(
        HashUtils.djb2Pick(values, "key"),
      );
    });

    it("returns the correct element based on djb2 hash", () => {
      const values = ["a", "b", "c", "d"];
      const key = "hello";
      const expectedIndex = HashUtils.djb2(key) % values.length;
      expect(HashUtils.djb2Pick(values, key)).toBe(values[expectedIndex]);
    });

    it("passes the seed on to the hash", () => {
      const values = ["a", "b", "c", "d", "e", "f", "g"];
      const expectedIndex = HashUtils.djb2("key", 5) % values.length;
      expect(HashUtils.djb2Pick(values, "key", 5)).toBe(values[expectedIndex]);
    });

    it("can pick different values for different keys", () => {
      const values = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const results = new Set(
        ["k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9", "k10"].map((k) =>
          HashUtils.djb2Pick(values, k),
        ),
      );
      expect(results.size).toBeGreaterThan(1);
    });

    it("works with a single-element array", () => {
      expect(HashUtils.djb2Pick([42], "anything")).toBe(42);
    });

    it("throws when given an empty array", () => {
      expect(() => HashUtils.djb2Pick([], "key")).toThrow(
        "Cannot pick from an empty array",
      );
    });
  });

  describe("lowbias32", () => {
    it("is deterministic", () => {
      expect(HashUtils.lowbias32(12345)).toBe(HashUtils.lowbias32(12345));
    });

    it("always returns a non-negative 32-bit integer", () => {
      for (const value of [0, 1, 42, 0x7fffffff, 0xffffffff, -1, 2 ** 40]) {
        const hash = HashUtils.lowbias32(value);
        expect(Number.isInteger(hash)).toBe(true);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(0xffffffff);
      }
    });

    it("only hashes the lower 32 bits", () => {
      expect(HashUtils.lowbias32(2 ** 32 + 7)).toBe(HashUtils.lowbias32(7));
      expect(HashUtils.lowbias32(-1)).toBe(HashUtils.lowbias32(0xffffffff));
    });

    it("defaults to seed 0", () => {
      expect(HashUtils.lowbias32(42)).toBe(HashUtils.lowbias32(42, 0));
    });

    it("yields different hashes for different seeds", () => {
      const hashes = new Set(
        [0, 1, 2, 3, 4, 5, 6, 7].map((seed) => HashUtils.lowbias32(42, seed)),
      );
      expect(hashes.size).toBe(8);
    });

    it("scatters consecutive integers", () => {
      const hashes = Array.from({ length: 100 }, (_, i) =>
        HashUtils.lowbias32(i),
      );
      expect(new Set(hashes).size).toBe(100);
      const deltas = new Set(hashes.slice(1).map((h, i) => h - hashes[i]!));
      expect(deltas.size).toBeGreaterThan(90);
    });
  });

  describe("lowbias32Pick", () => {
    it("returns a value from the array", () => {
      const values = ["red", "green", "blue"];
      expect(values).toContain(HashUtils.lowbias32Pick(values, 7));
    });

    it("returns the correct element based on lowbias32 hash", () => {
      const values = ["a", "b", "c", "d"];
      const expectedIndex = HashUtils.lowbias32(99) % values.length;
      expect(HashUtils.lowbias32Pick(values, 99)).toBe(values[expectedIndex]);
    });

    it("passes the seed on to the hash", () => {
      const values = ["a", "b", "c", "d", "e", "f", "g"];
      const expectedIndex = HashUtils.lowbias32(99, 5) % values.length;
      expect(HashUtils.lowbias32Pick(values, 99, 5)).toBe(
        values[expectedIndex],
      );
    });

    it("does not cycle through the array for consecutive keys", () => {
      const values = ["a", "b", "c", "d", "e", "f", "g", "h"];
      const picks = Array.from({ length: 16 }, (_, i) =>
        HashUtils.lowbias32Pick(values, i),
      );
      const cycled = values.concat(values);
      expect(picks).not.toEqual(cycled);
      expect(new Set(picks).size).toBeGreaterThan(1);
    });

    it("works with a single-element array", () => {
      expect(HashUtils.lowbias32Pick([42], 3)).toBe(42);
    });

    it("throws when given an empty array", () => {
      expect(() => HashUtils.lowbias32Pick([], 1)).toThrow(
        "Cannot pick from an empty array",
      );
    });
  });
});
