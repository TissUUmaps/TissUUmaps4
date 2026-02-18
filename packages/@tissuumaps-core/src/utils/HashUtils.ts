/** Utility methods for non-cryptographic hashing */
export class HashUtils {
  /**
   * Computes the djb2 hash of a string
   *
   * Returns a non-negative 32-bit integer.
   *
   * @see {@link http://www.cse.yorku.ca/~oz/hash.html}
   * @param str - The string to hash
   */
  static djb2(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
    }
    return hash >>> 0; // ensure non-negative
  }
}
