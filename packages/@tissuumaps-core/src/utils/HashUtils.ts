export class HashUtils {
  // http://www.cse.yorku.ca/~oz/hash.html
  static djb2(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i);
    }
    return hash >>> 0; // ensure non-negative
  }
}
