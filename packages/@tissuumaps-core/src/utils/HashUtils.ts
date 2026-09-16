/**
 * Constants for the three-round xorshift-multiply finalizer {@link HashUtils.fmix32}
 *
 * The finalizer computes `h ^= h >>> s1; h *= m1; h ^= h >>> s2; h *= m2;
 * h ^= h >>> s3` in 32-bit arithmetic. Shifts must lie in `[1, 31]` and
 * multipliers must be odd for the finalizer to remain a bijection.
 */
export type Fmix32Config = {
  /** Right shift of the first xorshift round, in bits */
  s1: number;
  /** Odd 32-bit multiplier applied after the first xorshift */
  m1: number;
  /** Right shift of the second xorshift round, in bits */
  s2: number;
  /** Odd 32-bit multiplier applied after the second xorshift */
  m2: number;
  /** Right shift of the final xorshift round, in bits */
  s3: number;
};

/**
 * Utility methods for non-cryptographic hashing
 *
 * Hashing a string is split into two steps: {@link hashRaw} reduces the
 * string to a 32-bit integer, and {@link mix} scrambles that integer together
 * with a seed. Callers that hash the same key repeatedly with different seeds
 * can cache the raw hash and only re-run the cheap mixing step. {@link hash}
 * does both in one call.
 *
 * The underlying primitives, {@link fnv1a} and {@link fmix32}, are exposed
 * for callers that need the plain algorithms without the seeding convention
 * of the methods above.
 */
export class HashUtils {
  private static readonly _murmur3Config: Fmix32Config = {
    s1: 16,
    m1: 0x85ebca6b,
    s2: 13,
    m2: 0xc2b2ae35,
    s3: 16,
  };

  /**
   * Computes the raw hash of a string
   *
   * Currently {@link fnv1a}. The raw hash is fast and deterministic, but only
   * weakly mixed: similar keys yield correlated hashes, and the hash of an
   * empty string is non-zero. Pass the result through {@link mix} before
   * using it to select from a small range.
   *
   * @param key - The string to hash; hashed by UTF-16 code unit
   * @returns The raw hash, as a non-negative 32-bit integer
   */
  static hashRaw(key: string): number {
    return HashUtils.fnv1a(key);
  }

  /**
   * Scrambles a 32-bit integer with a seed
   *
   * The seed is XOR-ed into the value, which is then passed through
   * {@link fmix32}. Consecutive inputs map to unrelated outputs, so the result
   * is suitable for scattering sequential IDs or raw string hashes over a
   * small range, e.g. `mix(id, seed) % palette.length`. Different seeds yield
   * different outputs for the same input.
   *
   * @param h - The integer to mix; only its lower 32 bits are used
   * @param seed - The seed; only its lower 32 bits are used
   * @returns The mixed value, as a non-negative 32-bit integer
   */
  static mix(h: number, seed: number = 0): number {
    return HashUtils.fmix32(h ^ seed);
  }

  /**
   * Computes a seeded 32-bit hash of a string
   *
   * Equivalent to `mix(hashRaw(key), seed)`.
   *
   * @param key - The string to hash; hashed by UTF-16 code unit
   * @param seed - The seed; only its lower 32 bits are used
   * @returns The hash, as a non-negative 32-bit integer
   */
  static hash(key: string, seed: number = 0): number {
    return HashUtils.mix(HashUtils.hashRaw(key), seed);
  }

  /**
   * Computes the 32-bit FNV-1a hash of a string
   *
   * Iterates over the UTF-16 code units of the string, XOR-ing each into the
   * running hash and multiplying by the FNV prime. The hash of an empty string
   * is the FNV offset basis (`0x811c9dc5`). Code units above `0xff` are XOR-ed
   * in whole rather than byte-wise, so results for non-Latin-1 text differ
   * from byte-oriented FNV-1a implementations.
   *
   * @see http://www.isthe.com/chongo/tech/comp/fnv/
   * @param str - The string to hash
   * @returns The hash, as a non-negative 32-bit integer
   */
  static fnv1a(str: string): number {
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
    }
    return h >>> 0;
  }

  /**
   * Applies a three-round xorshift-multiply finalizer; defaults to MurmurHash3's constants
   *
   * The finalizer is a bijective avalanche step: every input bit affects
   * every output bit, and distinct 32-bit inputs map to distinct outputs.
   * Note that `fmix32(0)` is `0`.
   *
   * @see https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp
   * @param h - The integer to finalize; only its lower 32 bits are used
   * @param c - The constants to use; defaults are the MurmurHash3 finalizer constants
   * @returns The finalized value, as a non-negative 32-bit integer
   */
  static fmix32(h: number, c: Fmix32Config = HashUtils._murmur3Config): number {
    h ^= h >>> c.s1;
    h = Math.imul(h, c.m1);
    h ^= h >>> c.s2;
    h = Math.imul(h, c.m2);
    h ^= h >>> c.s3;
    return h >>> 0;
  }
}
