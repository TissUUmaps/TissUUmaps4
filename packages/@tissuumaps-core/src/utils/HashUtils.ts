/**
 * Utility methods for non-cryptographic hashing
 *
 * Hashing a string is split into two steps: {@link hashRaw} reduces the
 * string to a 32-bit integer, and {@link mix} scrambles that integer together
 * with a seed. Callers that hash the same key repeatedly with different seeds
 * can cache the raw hash and only re-run the cheap mixing step. {@link hash}
 * does both in one call.
 */
export class HashUtils {
  /**
   * Computes the 32-bit FNV-1a hash of a string
   *
   * The hash is fast and deterministic, but only weakly mixed: similar keys
   * yield correlated hashes, and the hash of an empty string is the FNV offset
   * basis rather than zero. Pass the result through {@link mix} before using
   * it to select from a small range.
   *
   * @see http://www.isthe.com/chongo/tech/comp/fnv/
   * @param key - The string to hash; hashed by UTF-16 code unit
   * @returns The raw hash, as a non-negative 32-bit integer
   */
  static hashRaw(key: string): number {
    return HashUtils._fnv1a(key);
  }

  /**
   * Scrambles a 32-bit integer with a seed
   *
   * The seed is XOR-ed into the value, which is then passed through the
   * MurmurHash3 finalizer. Consecutive inputs map to unrelated outputs, so the
   * result is suitable for scattering sequential IDs or raw string hashes over
   * a small range, e.g. `mix(id, seed) % palette.length`. Different seeds
   * yield different outputs for the same input.
   *
   * @see https://github.com/aappleby/smhasher/blob/master/src/MurmurHash3.cpp
   * @param h - The integer to mix; only its lower 32 bits are used
   * @param seed - The seed; only its lower 32 bits are used
   * @returns The mixed value, as a non-negative 32-bit integer
   */
  static mix(h: number, seed: number = 0): number {
    return HashUtils._fmix32(h ^ seed);
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

  /** 32-bit FNV-1a over the UTF-16 code units of a string */
  private static _fnv1a(str: string): number {
    let h = 0x811c9dc5 >>> 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 0x01000193);
    }
    return h >>> 0;
  }

  /** MurmurHash3 32-bit finalizer (avalanche step) */
  private static _fmix32(h: number): number {
    h ^= h >>> 16;
    h = Math.imul(h, 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
    return h >>> 0;
  }
}
