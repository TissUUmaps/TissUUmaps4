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
 * per call; {@link toUnitFloat32} maps such a draw to `[0, 1)`. The `rand*`
 * methods take the first draw of a fresh generator, and the `fill*` methods
 * write consecutive draws of a fresh generator into a typed array. Because
 * they all consume the same stream, `fillUint32Array(array, seed)` starts
 * with `randUint32(seed)`, and filling a longer array yields the shorter one
 * as a prefix.
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
   * Returns the first 32-bit integer of the stream for a seed
   *
   * Equivalent to `createUint32RNG(seed)()`. Note that this is a pure
   * function of the seed: calling it repeatedly with the same seed returns the
   * same value.
   *
   * @param seed - The seed; only its lower 32 bits are used
   * @returns A non-negative 32-bit integer
   */
  static randUint32(seed: number = 0): number {
    const rng = RandomUtils.createUint32RNG(seed);
    return rng();
  }

  /**
   * Fills an array with consecutive 32-bit integers of a stream
   *
   * By default, a fresh generator is created from `seed`, so the first element
   * equals `randUint32(seed)`. Pass `rng` to draw from an existing generator
   * instead, e.g. to continue one stream across several arrays; `seed` is then
   * ignored.
   *
   * @param array - The array to fill; filled in place, over its whole length
   * @param seed - The seed; only its lower 32 bits are used
   * @param rng - The generator to draw from; defaults to `createUint32RNG(seed)`
   */
  static fillUint32Array(
    array: Uint32Array,
    seed: number = 0,
    rng: () => number = RandomUtils.createUint32RNG(seed),
  ): void {
    for (let i = 0; i < array.length; i++) {
      array[i] = rng();
    }
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
   * Returns the first draw of the stream for a seed, mapped to `[0, 1)`
   *
   * Equivalent to `toUnitFloat32(randUint32(seed))`. Note that this is a pure
   * function of the seed: calling it repeatedly with the same seed returns the
   * same value.
   *
   * @param seed - The seed; only its lower 32 bits are used
   * @returns A float in `[0, 1)`, exact in `float32`
   */
  static randUnitFloat32(seed: number = 0): number {
    const rng = RandomUtils.createUint32RNG(seed);
    return RandomUtils.toUnitFloat32(rng());
  }

  /**
   * Fills an array with consecutive draws of a stream, mapped to `[0, 1)`
   *
   * Each element is `toUnitFloat32` of the corresponding element that
   * {@link fillUint32Array} would produce for the same arguments. By default,
   * a fresh generator is created from `seed`, so the first element equals
   * `randUnitFloat32(seed)`. Pass `rng` to draw from an existing generator
   * instead, e.g. to continue one stream across several arrays; `seed` is then
   * ignored.
   *
   * @param array - The array to fill; filled in place, over its whole length
   * @param seed - The seed; only its lower 32 bits are used
   * @param rng - The generator to draw from; defaults to `createUint32RNG(seed)`
   */
  static fillUnitFloat32Array(
    array: Float32Array,
    seed: number = 0,
    rng: () => number = RandomUtils.createUint32RNG(seed),
  ): void {
    for (let i = 0; i < array.length; i++) {
      array[i] = RandomUtils.toUnitFloat32(rng());
    }
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
}
