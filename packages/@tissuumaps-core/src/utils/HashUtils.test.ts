import { describe, expect, it } from "vitest";

import { type Fmix32Config, HashUtils } from "./HashUtils";

describe("HashUtils", () => {
  describe("hashRaw", () => {
    it("returns the FNV offset basis for an empty string", () => {
      expect(HashUtils.hashRaw("")).toBe(0x811c9dc5);
    });

    it("returns known FNV-1a hash values", () => {
      expect(HashUtils.hashRaw("a")).toBe(0xe40c292c);
      expect(HashUtils.hashRaw("foobar")).toBe(0xbf9cf968);
      expect(HashUtils.hashRaw("hello")).toBe(0x4f9f2cab);
    });

    it("is deterministic", () => {
      const key = "test-string";
      expect(HashUtils.hashRaw(key)).toBe(HashUtils.hashRaw(key));
    });

    it("produces different hashes for different strings", () => {
      expect(HashUtils.hashRaw("abc")).not.toBe(HashUtils.hashRaw("def"));
      expect(HashUtils.hashRaw("12345")).not.toBe(HashUtils.hashRaw("54321"));
    });

    it("always returns a non-negative 32-bit integer", () => {
      for (const key of ["", "hello", "你好", "a".repeat(1000), "!@#$%^&*()"]) {
        const hash = HashUtils.hashRaw(key);
        expect(Number.isInteger(hash)).toBe(true);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(0xffffffff);
      }
    });
  });

  describe("mix", () => {
    it("is deterministic", () => {
      expect(HashUtils.mix(12345)).toBe(HashUtils.mix(12345));
      expect(HashUtils.mix(12345, 7)).toBe(HashUtils.mix(12345, 7));
    });

    it("returns known values", () => {
      expect(HashUtils.mix(0)).toBe(0);
      expect(HashUtils.mix(1)).toBe(1364076727);
      expect(HashUtils.mix(42)).toBe(142593372);
      expect(HashUtils.mix(0xdeadbeef)).toBe(233162409);
      expect(HashUtils.mix(42, 7)).toBe(4183680650);
    });

    it("always returns a non-negative 32-bit integer", () => {
      for (const h of [0, 1, 42, 0x7fffffff, 0xffffffff, -1, 2 ** 40]) {
        const mixed = HashUtils.mix(h);
        expect(Number.isInteger(mixed)).toBe(true);
        expect(mixed).toBeGreaterThanOrEqual(0);
        expect(mixed).toBeLessThanOrEqual(0xffffffff);
      }
    });

    it("only uses the lower 32 bits of the value", () => {
      expect(HashUtils.mix(2 ** 32 + 7)).toBe(HashUtils.mix(7));
      expect(HashUtils.mix(-1)).toBe(HashUtils.mix(0xffffffff));
    });

    it("only uses the lower 32 bits of the seed", () => {
      expect(HashUtils.mix(42, 2 ** 32 + 7)).toBe(HashUtils.mix(42, 7));
      expect(HashUtils.mix(42, -1)).toBe(HashUtils.mix(42, 0xffffffff));
    });

    it("defaults to seed 0", () => {
      expect(HashUtils.mix(42)).toBe(HashUtils.mix(42, 0));
    });

    it("yields different values for different seeds", () => {
      const mixed = new Set(
        [0, 1, 2, 3, 4, 5, 6, 7].map((seed) => HashUtils.mix(42, seed)),
      );
      expect(mixed.size).toBe(8);
    });

    it("scatters consecutive integers", () => {
      const mixed = Array.from({ length: 100 }, (_, i) => HashUtils.mix(i));
      expect(new Set(mixed).size).toBe(100);
      const deltas = new Set(mixed.slice(1).map((h, i) => h - mixed[i]!));
      expect(deltas.size).toBeGreaterThan(90);
    });

    it("does not cycle through a small range for consecutive integers", () => {
      const n = 8;
      const indices = Array.from(
        { length: 2 * n },
        (_, i) => HashUtils.mix(i) % n,
      );
      const cycled = Array.from({ length: 2 * n }, (_, i) => i % n);
      expect(indices).not.toEqual(cycled);
      expect(new Set(indices).size).toBeGreaterThan(1);
    });
  });

  describe("fnv1a", () => {
    it("returns the FNV offset basis for an empty string", () => {
      expect(HashUtils.fnv1a("")).toBe(0x811c9dc5);
    });

    it("returns known FNV-1a hash values", () => {
      expect(HashUtils.fnv1a("a")).toBe(0xe40c292c);
      expect(HashUtils.fnv1a("foobar")).toBe(0xbf9cf968);
      expect(HashUtils.fnv1a("hello")).toBe(0x4f9f2cab);
    });

    it("hashes by UTF-16 code unit", () => {
      // 你 is U+4F60; a single code unit is XOR-ed in whole, not byte-wise
      const expected = Math.imul(0x811c9dc5 ^ 0x4f60, 0x01000193) >>> 0;
      expect(HashUtils.fnv1a("你")).toBe(expected);
    });

    it("backs hashRaw", () => {
      for (const key of ["", "hello", "你好", "a".repeat(1000)]) {
        expect(HashUtils.hashRaw(key)).toBe(HashUtils.fnv1a(key));
      }
    });

    it("always returns a non-negative 32-bit integer", () => {
      for (const key of ["", "hello", "你好", "a".repeat(1000), "!@#$%^&*()"]) {
        const hash = HashUtils.fnv1a(key);
        expect(Number.isInteger(hash)).toBe(true);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(0xffffffff);
      }
    });
  });

  describe("fmix32", () => {
    const splitmix32Config: Fmix32Config = {
      s1: 16,
      m1: 0x21f0aaad,
      s2: 15,
      m2: 0x735a2d97,
      s3: 15,
    };

    it("maps zero to zero", () => {
      expect(HashUtils.fmix32(0)).toBe(0);
      expect(HashUtils.fmix32(0, splitmix32Config)).toBe(0);
    });

    it("returns known MurmurHash3 finalizer values by default", () => {
      expect(HashUtils.fmix32(1)).toBe(1364076727);
      expect(HashUtils.fmix32(42)).toBe(142593372);
      expect(HashUtils.fmix32(0xdeadbeef)).toBe(233162409);
    });

    it("backs mix", () => {
      for (const h of [0, 1, 42, 0xdeadbeef]) {
        expect(HashUtils.mix(h)).toBe(HashUtils.fmix32(h));
        expect(HashUtils.mix(h, 7)).toBe(HashUtils.fmix32(h ^ 7));
      }
    });

    it("uses the given constants", () => {
      // first SplitMix32 output for seed 0, per the reference implementation
      expect(HashUtils.fmix32(0x9e3779b9, splitmix32Config)).toBe(1684164658);
      expect(HashUtils.fmix32(42, splitmix32Config)).not.toBe(
        HashUtils.fmix32(42),
      );
    });

    it("only uses the lower 32 bits of the value", () => {
      expect(HashUtils.fmix32(2 ** 32 + 7)).toBe(HashUtils.fmix32(7));
      expect(HashUtils.fmix32(-1)).toBe(HashUtils.fmix32(0xffffffff));
    });

    it("always returns a non-negative 32-bit integer", () => {
      for (const h of [0, 1, 42, 0x7fffffff, 0xffffffff, -1, 2 ** 40]) {
        for (const c of [undefined, splitmix32Config]) {
          const mixed = HashUtils.fmix32(h, c);
          expect(Number.isInteger(mixed)).toBe(true);
          expect(mixed).toBeGreaterThanOrEqual(0);
          expect(mixed).toBeLessThanOrEqual(0xffffffff);
        }
      }
    });

    it("is injective on a range of inputs", () => {
      const n = 10000;
      for (const c of [undefined, splitmix32Config]) {
        const mixed = new Set(
          Array.from({ length: n }, (_, i) => HashUtils.fmix32(i, c)),
        );
        expect(mixed.size).toBe(n);
      }
    });
  });

  describe("hash", () => {
    it("equals mix(hashRaw(key), seed)", () => {
      for (const key of ["", "hello", "你好", "groupA"]) {
        for (const seed of [0, 1, 7, 0xffffffff]) {
          expect(HashUtils.hash(key, seed)).toBe(
            HashUtils.mix(HashUtils.hashRaw(key), seed),
          );
        }
      }
    });

    it("returns known values", () => {
      expect(HashUtils.hash("hello")).toBe(2290972270);
      expect(HashUtils.hash("hello", 7)).toBe(2961842598);
    });

    it("does not hash the empty string to zero", () => {
      expect(HashUtils.hash("")).not.toBe(0);
    });

    it("is deterministic", () => {
      const key = "test-string";
      expect(HashUtils.hash(key)).toBe(HashUtils.hash(key));
      expect(HashUtils.hash(key, 3)).toBe(HashUtils.hash(key, 3));
    });

    it("produces different hashes for different strings", () => {
      expect(HashUtils.hash("abc")).not.toBe(HashUtils.hash("def"));
      expect(HashUtils.hash("12345")).not.toBe(HashUtils.hash("54321"));
    });

    it("always returns a non-negative 32-bit integer", () => {
      for (const key of ["", "hello", "你好", "a".repeat(1000), "!@#$%^&*()"]) {
        const hash = HashUtils.hash(key);
        expect(Number.isInteger(hash)).toBe(true);
        expect(hash).toBeGreaterThanOrEqual(0);
        expect(hash).toBeLessThanOrEqual(0xffffffff);
      }
    });

    it("defaults to seed 0", () => {
      expect(HashUtils.hash("abc")).toBe(HashUtils.hash("abc", 0));
    });

    it("yields different hashes for different seeds", () => {
      const hashes = new Set(
        [0, 1, 2, 3, 4, 5, 6, 7].map((seed) => HashUtils.hash("abc", seed)),
      );
      expect(hashes.size).toBe(8);
    });

    it("can select different values from a small range for different keys", () => {
      const n = 8;
      const indices = new Set(
        ["k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9", "k10"].map(
          (key) => HashUtils.hash(key) % n,
        ),
      );
      expect(indices.size).toBeGreaterThan(1);
    });
  });
});
