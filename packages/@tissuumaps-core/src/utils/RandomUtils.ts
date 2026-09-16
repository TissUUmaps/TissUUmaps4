import { type Fmix32Config, HashUtils } from "./HashUtils";

/**
 * Utility methods for seeded, non-cryptographic pseudo-random numbers
 *
 * All methods except {@link seed} are deterministic: the same seed always
 * yields the same sequence, so callers can store a seed instead of the values
 * it produced (e.g. for reproducible random colors). None of the generators
 * are suitable for security-sensitive purposes.
 *
 * {@link createUint32RNG} returns a generator that draws one 32-bit integer
 * per call; {@link toUnitFloat32} maps such a draw to `[0, 1)`. The scalar
 * `rand*` methods take the first draw of a fresh generator, and the
 * `rand*Array` methods write consecutive draws of a fresh generator into a
 * typed array. Because they all consume the same stream,
 * `randUint32Array(n, seed)` starts with `randUint32(seed)`, and a longer
 * array has the shorter one as a prefix.
 *
 * Every `rand*` method takes either a seed or a generator as `seedOrRng`. A
 * seed creates a fresh generator; passing a generator draws from it instead,
 * which allows continuing one stream across several calls.
 *
 * The underlying generator, {@link splitmix32}, is exposed for callers that
 * need the plain algorithm regardless of the current default.
 */
export class RandomUtils {
  private static readonly _splitmix32Config: Fmix32Config = {
    s1: 16,
    m1: 0x21f0aaad,
    s2: 15,
    m2: 0x735a2d97,
    s3: 15,
  };

  /**
   * Draws a random seed from `Math.random()`
   *
   * This is the one non-deterministic method of this class; use it to obtain
   * a seed for the other methods when reproducibility is not required, e.g.
   * for a "shuffle" action. The result is stored rather than the values it
   * produces, so the draw can be reproduced later.
   *
   * @returns A uniformly distributed non-negative 32-bit integer
   */
  static seed(): number {
    return (Math.random() * 0x100000000) >>> 0;
  }

  /**
   * Creates a seeded generator of 32-bit integers
   *
   * Currently {@link splitmix32}. Each call to the returned function yields
   * the next value of the stream.
   *
   * @param seed - The seed; only its lower 32 bits are used
   * @returns A function that returns the next non-negative 32-bit integer
   */
  static createUint32RNG(seed: number = 0): () => number {
    return RandomUtils.splitmix32(seed);
  }

  /**
   * Draws a 32-bit integer
   *
   * Given a seed, returns the first value of a fresh generator for it, i.e.
   * `createUint32RNG(seed)()`. Note that this is a pure function of the seed:
   * calling it repeatedly with the same seed returns the same value. Given a
   * generator, returns its next value instead.
   *
   * @param seedOrRng - The seed (only its lower 32 bits are used), or the
   * generator to draw from
   * @returns A non-negative 32-bit integer
   */
  static randUint32(seedOrRng: number | (() => number) = 0): number {
    return RandomUtils._toRNG(seedOrRng)();
  }

  /**
   * Draws consecutive 32-bit integers into an array
   *
   * Given a seed, values come from a fresh generator for it, so the first
   * element equals `randUint32(seed)`. Given a generator, its next `n` values
   * are drawn instead, e.g. to continue one stream across several arrays. By
   * default, a new array of length `n` is allocated; pass `array` to fill the
   * first `n` elements of an existing array in place instead, leaving any
   * further elements untouched.
   *
   * @param n - The number of values to draw, a non-negative integer
   * @param seedOrRng - The seed (only its lower 32 bits are used), or the
   * generator to draw from
   * @param array - The array to fill; defaults to `new Uint32Array(n)`
   * @returns The filled array, i.e. `array` if given
   * @throws RangeError if `array` is given and holds fewer than `n` elements
   */
  static randUint32Array(
    n: number,
    seedOrRng: number | (() => number) = 0,
    array: Uint32Array = new Uint32Array(n),
  ): Uint32Array {
    if (n > array.length) {
      throw new RangeError("array must hold at least n elements");
    }
    const rng = RandomUtils._toRNG(seedOrRng);
    for (let i = 0; i < n; i++) {
      array[i] = rng();
    }
    return array;
  }

  /**
   * Maps a 32-bit integer to a float in `[0, 1)` that is exact in `float32`
   *
   * Uses the upper 24 bits of the integer, so the result is a multiple of
   * `2^-24` and survives storage in a `Float32Array` without rounding. The
   * largest possible result is `1 - 2^-24`; the lower 8 bits of the input are
   * discarded.
   *
   * @param uint32 - The integer to map; only its lower 32 bits are used
   * @returns A float in `[0, 1)`
   */
  static toUnitFloat32(uint32: number): number {
    // 24-bit draw, max is 1 - 2^-24, exact in float32
    return (uint32 >>> 8) / 0x1000000;
  }

  /**
   * Draws a float in `[0, 1)` that is exact in `float32`
   *
   * Equivalent to `toUnitFloat32(randUint32(seedOrRng))`. Given a seed, this
   * is a pure function of it: calling it repeatedly with the same seed returns
   * the same value. Given a generator, its next value is drawn instead.
   *
   * @param seedOrRng - The seed (only its lower 32 bits are used), or the
   * generator to draw from
   * @returns A float in `[0, 1)`, exact in `float32`
   */
  static randUnitFloat32(seedOrRng: number | (() => number) = 0): number {
    return RandomUtils.toUnitFloat32(RandomUtils.randUint32(seedOrRng));
  }

  /**
   * Draws consecutive floats in `[0, 1)` into an array
   *
   * Each element is `toUnitFloat32` of the corresponding element that
   * {@link randUint32Array} would produce for the same arguments, and is
   * stored in the `Float32Array` without rounding. Given a seed, values come
   * from a fresh generator for it, so the first element equals
   * `randUnitFloat32(seed)`. Given a generator, its next `n` values are drawn
   * instead, e.g. to continue one stream across several arrays. By default, a
   * new array of length `n` is allocated; pass `array` to fill the first `n`
   * elements of an existing array in place instead, leaving any further
   * elements untouched.
   *
   * @param n - The number of values to draw, a non-negative integer
   * @param seedOrRng - The seed (only its lower 32 bits are used), or the
   * generator to draw from
   * @param array - The array to fill; defaults to `new Float32Array(n)`
   * @returns The filled array, i.e. `array` if given
   * @throws RangeError if `array` is given and holds fewer than `n` elements
   */
  static randUnitFloat32Array(
    n: number,
    seedOrRng: number | (() => number) = 0,
    array: Float32Array = new Float32Array(n),
  ): Float32Array {
    if (n > array.length) {
      throw new RangeError("array must hold at least n elements");
    }
    const rng = RandomUtils._toRNG(seedOrRng);
    for (let i = 0; i < n; i++) {
      array[i] = RandomUtils.toUnitFloat32(rng());
    }
    return array;
  }

  /**
   * Creates a SplitMix32 generator
   *
   * The state is a 32-bit counter advanced by the golden-ratio constant
   * `0x9e3779b9` (a Weyl sequence); each output is the state passed through
   * {@link HashUtils.fmix32} with the SplitMix32 constants. Since the
   * finalizer is a bijection, the stream has a period of `2^32` and visits
   * every 32-bit value exactly once per period. All seeds walk the same
   * cycle; seeds that differ in their lower 32 bits start at different points.
   *
   * @see https://github.com/bryc/code/blob/master/jshash/PRNGs.md#splitmix32
   * @param seed - The seed; only its lower 32 bits are used
   * @returns A function that returns the next non-negative 32-bit integer
   */
  static splitmix32(seed: number = 0): () => number {
    let h = seed >>> 0;
    return () => {
      h = (h + 0x9e3779b9) >>> 0;
      return HashUtils.fmix32(h, RandomUtils._splitmix32Config);
    };
  }

  /**
   * Resolves a seed or generator to a generator
   *
   * @param seedOrRng - A seed, or an existing generator
   * @returns A fresh generator for the seed, or the given generator
   */
  private static _toRNG(seedOrRng: number | (() => number)): () => number {
    return typeof seedOrRng === "number"
      ? RandomUtils.createUint32RNG(seedOrRng)
      : seedOrRng;
  }
}
