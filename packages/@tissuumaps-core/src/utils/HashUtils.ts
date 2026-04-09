/** Utility methods for non-cryptographic hashing */
export class HashUtils {
  /**
   * Computes the djb2 hash of a string
   *
   * Returns a non-negative 32-bit integer.
   *
   * @see http://www.cse.yorku.ca/~oz/hash.html
   * @param str - The string to hash
   */
  static djb2(str: string): number {
    let hash = 5381;
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
   * @returns A value from the array corresponding to the hashed key
   */
  static djb2Pick<T>(values: T[], key: string): T {
    const index = HashUtils.djb2(key) % values.length;
    return values[index]!;
  }
}
