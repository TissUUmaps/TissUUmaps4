/** Utility methods for non-cryptographic hashing */
export class HashUtils {
  /**
   * Computes the djb2 hash of a string
   *
   * @see http://www.cse.yorku.ca/~oz/hash.html
   * @param str - The string to hash
   * @param seed - The seed to use for the hash
   * @returns The hash, as a non-negative 32-bit integer
   */
  static djb2(str: string, seed: number = 5381): number {
    let hash = seed;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
    }
    return hash >>> 0; // ensure non-negative
  }

  /**
   * Deterministically selects a value from an array based on the djb2 hash of a key string
   *
   * @param values - The array of values to select from
   * @param key - The string key to hash and use for selection
   * @param seed - The seed to use for the hash
   * @returns The value corresponding to the hashed key
   * @throws Error if the array is empty
   */
  static djb2Pick<T>(values: T[], key: string, seed: number = 5381): T {
    if (values.length === 0) {
      throw new Error("Cannot pick from an empty array");
    }
    const index = HashUtils.djb2(key, seed) % values.length;
    return values[index]!;
  }

  /**
   * Computes the lowbias32 hash of a 32-bit integer
   *
   * Unlike {@link djb2} over the decimal string of a number, consecutive
   * integers map to unrelated hashes, so the hash is suitable for scattering
   * sequential IDs over a small range. Different seeds yield different
   * hashes for the same value.
   *
   * @see https://github.com/skeeto/hash-prospector
   * @param value - The integer to hash; only its lower 32 bits are used
   * @param seed - The seed, XOR-ed into the value before hashing; only its
   * lower 32 bits are used
   * @returns The hash, as a non-negative 32-bit integer
   */
  static lowbias32(value: number, seed: number = 0): number {
    let hash = (value ^ seed) >>> 0;
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x7feb352d);
    hash ^= hash >>> 15;
    hash = Math.imul(hash, 0x846ca68b);
    hash ^= hash >>> 16;
    return hash >>> 0; // ensure non-negative
  }

  /**
   * Deterministically selects a value from an array based on the lowbias32 hash of an integer key
   *
   * @param values - The array of values to select from
   * @param key - The integer key to hash and use for selection
   * @param seed - The seed (see {@link lowbias32})
   * @returns The value corresponding to the hashed key
   * @throws Error if the array is empty
   */
  static lowbias32Pick<T>(values: T[], key: number, seed: number = 0): T {
    if (values.length === 0) {
      throw new Error("Cannot pick from an empty array");
    }
    const index = HashUtils.lowbias32(key, seed) % values.length;
    return values[index]!;
  }
}
