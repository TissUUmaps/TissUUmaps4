import { describe, expect, it } from "vitest";

import { HashUtils } from "./HashUtils";

describe("HashUtils", () => {
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
  });
});
