import { afterEach, describe, expect, it, vi } from "vitest";

import { RandomUtils } from "./RandomUtils";

// First four SplitMix32 outputs per seed, computed with the reference
// implementation (https://github.com/bryc/code/blob/master/jshash/PRNGs.md)
const splitmix32Vectors: [number, number[]][] = [
  [0, [1684164658, 3653269916, 2939563536, 2141751570]],
  [1, [1580013426, 350525680, 3524174333, 3011703609]],
  [42, [551831576, 144025891, 322543647, 3034809370]],
  [0xdeadbeef, [46217145, 304148291, 1711218402, 2692075039]],
];

function expectUint32(value: number): void {
  expect(Number.isInteger(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(0xffffffff);
}

function expectUnitFloat32(value: number): void {
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThan(1);
  expect(Math.fround(value)).toBe(value);
  expect(Number.isInteger(value * 0x1000000)).toBe(true);
}

describe("RandomUtils", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("seed", () => {
    it("always returns a non-negative 32-bit integer", () => {
      for (let i = 0; i < 100; i++) {
        expectUint32(RandomUtils.seed());
      }
    });

    it("is not deterministic", () => {
      const seeds = new Set(
        Array.from({ length: 100 }, () => RandomUtils.seed()),
      );
      expect(seeds.size).toBeGreaterThan(1);
    });

    it("scales Math.random() to the full 32-bit range", () => {
      const random = vi.spyOn(Math, "random");
      random.mockReturnValue(0);
      expect(RandomUtils.seed()).toBe(0);
      random.mockReturnValue(0.5);
      expect(RandomUtils.seed()).toBe(0x80000000);
      random.mockReturnValue(1 - 2 ** -53);
      expect(RandomUtils.seed()).toBe(0xffffffff);
    });
  });

  describe("createUint32RNG", () => {
    it("returns known SplitMix32 values", () => {
      for (const [seed, expected] of splitmix32Vectors) {
        const rng = RandomUtils.createUint32RNG(seed);
        expect(expected.map(() => rng())).toEqual(expected);
      }
    });

    it("is deterministic", () => {
      const a = RandomUtils.createUint32RNG(42);
      const b = RandomUtils.createUint32RNG(42);
      for (let i = 0; i < 100; i++) {
        expect(a()).toBe(b());
      }
    });

    it("defaults to seed 0", () => {
      const a = RandomUtils.createUint32RNG();
      const b = RandomUtils.createUint32RNG(0);
      expect(a()).toBe(b());
    });

    it("only uses the lower 32 bits of the seed", () => {
      expect(RandomUtils.createUint32RNG(2 ** 32 + 7)()).toBe(
        RandomUtils.createUint32RNG(7)(),
      );
      expect(RandomUtils.createUint32RNG(-1)()).toBe(
        RandomUtils.createUint32RNG(0xffffffff)(),
      );
    });

    it("yields different streams for different seeds", () => {
      const firsts = new Set(
        [0, 1, 2, 3, 4, 5, 6, 7].map((seed) =>
          RandomUtils.createUint32RNG(seed)(),
        ),
      );
      expect(firsts.size).toBe(8);
    });

    it("always returns a non-negative 32-bit integer", () => {
      const rng = RandomUtils.createUint32RNG(0xdeadbeef);
      for (let i = 0; i < 1000; i++) {
        expectUint32(rng());
      }
    });

    it("does not repeat within a long stretch", () => {
      const rng = RandomUtils.createUint32RNG(3);
      const n = 10000;
      const values = new Set(Array.from({ length: n }, rng));
      expect(values.size).toBe(n);
    });
  });

  describe("randUint32", () => {
    it("returns the first value of the stream", () => {
      for (const [seed, expected] of splitmix32Vectors) {
        expect(RandomUtils.randUint32(seed)).toBe(expected[0]);
        expect(RandomUtils.randUint32(seed)).toBe(
          RandomUtils.createUint32RNG(seed)(),
        );
      }
    });

    it("is a pure function of the seed", () => {
      expect(RandomUtils.randUint32(42)).toBe(RandomUtils.randUint32(42));
    });

    it("defaults to seed 0", () => {
      expect(RandomUtils.randUint32()).toBe(RandomUtils.randUint32(0));
    });

    it("always returns a non-negative 32-bit integer", () => {
      for (const seed of [0, 1, 42, 0x7fffffff, 0xffffffff, -1, 2 ** 40]) {
        expectUint32(RandomUtils.randUint32(seed));
      }
    });

    it("draws the next value from a given rng", () => {
      const rng = RandomUtils.createUint32RNG(42);
      const expected = RandomUtils.createUint32RNG(42);
      expect(RandomUtils.randUint32(rng)).toBe(expected());
      expect(RandomUtils.randUint32(rng)).toBe(expected());
      expect(RandomUtils.randUint32(rng)).toBe(expected());
    });
  });

  describe("randUint32Array", () => {
    it("returns a new array of length n filled with the stream for the seed", () => {
      for (const [seed, expected] of splitmix32Vectors) {
        const array = RandomUtils.randUint32Array(expected.length, seed);
        expect(array).toBeInstanceOf(Uint32Array);
        expect(array.length).toBe(expected.length);
        expect(Array.from(array)).toEqual(expected);
      }
    });

    it("starts with randUint32(seed)", () => {
      const array = RandomUtils.randUint32Array(1, 42);
      expect(array[0]).toBe(RandomUtils.randUint32(42));
    });

    it("defaults to seed 0", () => {
      expect(RandomUtils.randUint32Array(8)).toEqual(
        RandomUtils.randUint32Array(8, 0),
      );
    });

    it("fills the whole array", () => {
      const array = RandomUtils.randUint32Array(100, 7);
      expect(array.every((v) => v !== 0)).toBe(true);
    });

    it("returns an empty array for n = 0", () => {
      expect(RandomUtils.randUint32Array(0, 7).length).toBe(0);
    });

    it("yields shorter arrays as prefixes of longer arrays", () => {
      const short = RandomUtils.randUint32Array(10, 42);
      const long = RandomUtils.randUint32Array(100, 42);
      expect(long.subarray(0, 10)).toEqual(short);
    });

    it("fills the given array in place and returns it", () => {
      const array = new Uint32Array(5);
      const result = RandomUtils.randUint32Array(5, 42, array);
      expect(result).toBe(array);
      expect(array).toEqual(RandomUtils.randUint32Array(5, 42));
    });

    it("fills only the first n elements of the given array", () => {
      const array = new Uint32Array(10).fill(0xffffffff);
      RandomUtils.randUint32Array(5, 42, array);
      expect(array.subarray(0, 5)).toEqual(RandomUtils.randUint32Array(5, 42));
      expect(Array.from(array.subarray(5))).toEqual(
        new Array<number>(5).fill(0xffffffff),
      );
    });

    it("throws if the given array holds fewer than n elements", () => {
      expect(() =>
        RandomUtils.randUint32Array(6, 42, new Uint32Array(5)),
      ).toThrow(RangeError);
    });

    it("draws consecutive values from a given rng", () => {
      const rng = RandomUtils.createUint32RNG(42);
      const a = RandomUtils.randUint32Array(5, rng);
      const b = RandomUtils.randUint32Array(5, rng, new Uint32Array(5));
      const expected = RandomUtils.randUint32Array(10, 42);
      expect(a).toEqual(expected.subarray(0, 5));
      expect(b).toEqual(expected.subarray(5, 10));
    });
  });

  describe("toUnitFloat32", () => {
    it("maps the extremes of the input range", () => {
      expect(RandomUtils.toUnitFloat32(0)).toBe(0);
      expect(RandomUtils.toUnitFloat32(0xffffffff)).toBe(1 - 2 ** -24);
    });

    it("maps to multiples of 2^-24", () => {
      expect(RandomUtils.toUnitFloat32(0x100)).toBe(2 ** -24);
      expect(RandomUtils.toUnitFloat32(0x80000000)).toBe(0.5);
    });

    it("discards the lower 8 bits", () => {
      expect(RandomUtils.toUnitFloat32(0x1ff)).toBe(
        RandomUtils.toUnitFloat32(0x100),
      );
      expect(RandomUtils.toUnitFloat32(0xff)).toBe(0);
    });

    it("is monotonic", () => {
      let prev = -1;
      for (let h = 0; h <= 0xffffffff; h += 0x01000101) {
        const value = RandomUtils.toUnitFloat32(h);
        expect(value).toBeGreaterThanOrEqual(prev);
        prev = value;
      }
    });

    it("only uses the lower 32 bits of the value", () => {
      expect(RandomUtils.toUnitFloat32(2 ** 32 + 0x100)).toBe(
        RandomUtils.toUnitFloat32(0x100),
      );
      expect(RandomUtils.toUnitFloat32(-1)).toBe(
        RandomUtils.toUnitFloat32(0xffffffff),
      );
    });

    it("always returns a float in [0, 1) that is exact in float32", () => {
      const rng = RandomUtils.createUint32RNG(5);
      for (let i = 0; i < 1000; i++) {
        expectUnitFloat32(RandomUtils.toUnitFloat32(rng()));
      }
    });
  });

  describe("randUnitFloat32", () => {
    it("equals toUnitFloat32(randUint32(seed))", () => {
      for (const seed of [0, 1, 42, 0xdeadbeef]) {
        expect(RandomUtils.randUnitFloat32(seed)).toBe(
          RandomUtils.toUnitFloat32(RandomUtils.randUint32(seed)),
        );
      }
    });

    it("is a pure function of the seed", () => {
      expect(RandomUtils.randUnitFloat32(42)).toBe(
        RandomUtils.randUnitFloat32(42),
      );
    });

    it("defaults to seed 0", () => {
      expect(RandomUtils.randUnitFloat32()).toBe(
        RandomUtils.randUnitFloat32(0),
      );
    });

    it("always returns a float in [0, 1) that is exact in float32", () => {
      for (const seed of [0, 1, 42, 0x7fffffff, 0xffffffff, -1, 2 ** 40]) {
        expectUnitFloat32(RandomUtils.randUnitFloat32(seed));
      }
    });

    it("draws the next value from a given rng", () => {
      const rng = RandomUtils.createUint32RNG(42);
      const expected = RandomUtils.createUint32RNG(42);
      expect(RandomUtils.randUnitFloat32(rng)).toBe(
        RandomUtils.toUnitFloat32(expected()),
      );
      expect(RandomUtils.randUnitFloat32(rng)).toBe(
        RandomUtils.toUnitFloat32(expected()),
      );
    });
  });

  describe("randUnitFloat32Array", () => {
    it("returns a new array of length n mapped through toUnitFloat32", () => {
      for (const [seed, expected] of splitmix32Vectors) {
        const array = RandomUtils.randUnitFloat32Array(expected.length, seed);
        expect(array).toBeInstanceOf(Float32Array);
        expect(array.length).toBe(expected.length);
        expect(Array.from(array)).toEqual(
          expected.map((v) => RandomUtils.toUnitFloat32(v)),
        );
      }
    });

    it("starts with randUnitFloat32(seed)", () => {
      const array = RandomUtils.randUnitFloat32Array(1, 42);
      expect(array[0]).toBe(RandomUtils.randUnitFloat32(42));
    });

    it("stores values without rounding", () => {
      const uints = RandomUtils.randUint32Array(100, 7);
      const floats = RandomUtils.randUnitFloat32Array(100, 7);
      for (let i = 0; i < 100; i++) {
        expect(floats[i]).toBe(RandomUtils.toUnitFloat32(uints[i]!));
      }
    });

    it("defaults to seed 0", () => {
      expect(RandomUtils.randUnitFloat32Array(8)).toEqual(
        RandomUtils.randUnitFloat32Array(8, 0),
      );
    });

    it("returns an empty array for n = 0", () => {
      expect(RandomUtils.randUnitFloat32Array(0, 7).length).toBe(0);
    });

    it("yields shorter arrays as prefixes of longer arrays", () => {
      const short = RandomUtils.randUnitFloat32Array(10, 42);
      const long = RandomUtils.randUnitFloat32Array(100, 42);
      expect(long.subarray(0, 10)).toEqual(short);
    });

    it("fills the given array in place and returns it", () => {
      const array = new Float32Array(5);
      const result = RandomUtils.randUnitFloat32Array(5, 42, array);
      expect(result).toBe(array);
      expect(array).toEqual(RandomUtils.randUnitFloat32Array(5, 42));
    });

    it("fills only the first n elements of the given array", () => {
      const array = new Float32Array(10).fill(-1);
      RandomUtils.randUnitFloat32Array(5, 42, array);
      expect(array.subarray(0, 5)).toEqual(
        RandomUtils.randUnitFloat32Array(5, 42),
      );
      expect(Array.from(array.subarray(5))).toEqual(
        new Array<number>(5).fill(-1),
      );
    });

    it("throws if the given array holds fewer than n elements", () => {
      expect(() =>
        RandomUtils.randUnitFloat32Array(6, 42, new Float32Array(5)),
      ).toThrow(RangeError);
    });

    it("draws consecutive values from a given rng", () => {
      const rng = RandomUtils.createUint32RNG(42);
      const a = RandomUtils.randUnitFloat32Array(5, rng);
      const b = RandomUtils.randUnitFloat32Array(5, rng, new Float32Array(5));
      const expected = RandomUtils.randUnitFloat32Array(10, 42);
      expect(a).toEqual(expected.subarray(0, 5));
      expect(b).toEqual(expected.subarray(5, 10));
    });
  });

  describe("splitmix32", () => {
    it("matches the reference implementation", () => {
      for (const [seed, expected] of splitmix32Vectors) {
        const rng = RandomUtils.splitmix32(seed);
        expect(expected.map(() => rng())).toEqual(expected);
      }
    });

    it("backs createUint32RNG", () => {
      const a = RandomUtils.splitmix32(42);
      const b = RandomUtils.createUint32RNG(42);
      for (let i = 0; i < 100; i++) {
        expect(a()).toBe(b());
      }
    });

    it("defaults to seed 0", () => {
      expect(RandomUtils.splitmix32()()).toBe(RandomUtils.splitmix32(0)());
    });

    it("only uses the lower 32 bits of the seed", () => {
      expect(RandomUtils.splitmix32(2 ** 32 + 7)()).toBe(
        RandomUtils.splitmix32(7)(),
      );
      expect(RandomUtils.splitmix32(-1)()).toBe(
        RandomUtils.splitmix32(0xffffffff)(),
      );
    });

    it("walks the same cycle for every seed", () => {
      // advancing the seed by the golden-ratio increment skips one output
      const a = RandomUtils.splitmix32(42);
      const b = RandomUtils.splitmix32((42 + 0x9e3779b9) >>> 0);
      a();
      for (let i = 0; i < 100; i++) {
        expect(a()).toBe(b());
      }
    });

    it("always returns a non-negative 32-bit integer", () => {
      const rng = RandomUtils.splitmix32(0xffffffff);
      for (let i = 0; i < 1000; i++) {
        expectUint32(rng());
      }
    });
  });
});
