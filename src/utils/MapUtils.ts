export default class MapUtils {
  static map<K, V, T>(
    map: Map<K, V>,
    callbackfn: (key: K, value: V, index: number, map: Map<K, V>) => T,
    thisArg?: unknown,
  ): T[] {
    if (thisArg) {
      callbackfn = callbackfn.bind(thisArg);
    }
    const results: T[] = [];
    for (const [key, value] of map) {
      const result = callbackfn(key, value, results.length, map);
      results.push(result);
    }
    return results;
  }

  static splice<K, V>(
    map: Map<K, V>,
    start: number,
    deleteCount?: number,
    ...items: [K, V][]
  ): Map<K, V> {
    const entries = Array.from(map.entries());
    if (deleteCount === undefined) {
      entries.splice(start);
    } else {
      entries.splice(start, deleteCount, ...items);
    }
    return new Map(entries);
  }

  static cloneAndSet<K, V>(
    map: Map<K, V>,
    key: K,
    value: V,
    index?: number,
  ): Map<K, V> {
    map = new Map(map);
    if (index !== undefined) {
      map.delete(key);
      map = MapUtils.splice(map, index, 0, [key, value]);
    } else {
      map.set(key, value);
    }
    return map;
  }
}
