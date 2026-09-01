/** Utility methods for non-cryptographic hashing */
export class HashUtils {
  /**
   * Computes the djb2 hash of a string
   *
   * @see http://www.cse.yorku.ca/~oz/hash.html
   * @param str - The string to hash
   * @returns The hash, as a non-negative 32-bit integer
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
   * @returns The value corresponding to the hashed key
   * @throws Error if the array is empty
   */
  static djb2Pick<T>(values: T[], key: string): T {
    if (values.length === 0) {
      throw new Error("Cannot pick from an empty array");
    }
    const index = HashUtils.djb2(key) % values.length;
    return values[index]!;
  }
}
