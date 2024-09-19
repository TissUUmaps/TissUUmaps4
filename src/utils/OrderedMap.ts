export default class OrderedMap<K, V> implements Map<K, V> {
  private data: Map<K, V> = new Map();
  private order: K[] = [];

  constructor(iterable?: Iterable<[K, V]>) {
    if (iterable) {
      for (const [key, value] of iterable) {
        this.data.set(key, value);
        this.order.push(key);
      }
    }
  }

  get size(): number {
    return this.data.size;
  }

  get [Symbol.toStringTag](): string {
    return "OrderedMap";
  }

  clear(): void {
    this.data.clear();
    this.order = [];
  }

  delete(key: K): boolean {
    const deleted = this.data.delete(key);
    if (deleted) {
      this.order = this.order.filter((k) => k !== key);
    }
    return deleted;
  }

  *entries(): IterableIterator<[K, V]> {
    for (const key of this.order) {
      const value = this.data.get(key)!;
      yield [key, value];
    }
  }

  forEach(
    callbackfn: (value: V, key: K, map: this) => void,
    thisArg: unknown,
  ): void {
    if (thisArg) {
      callbackfn = callbackfn.bind(thisArg);
    }
    for (const key of this.order) {
      const value = this.data.get(key)!;
      callbackfn(value, key, this);
    }
  }

  get(key: K): V | undefined {
    return this.data.get(key);
  }

  has(key: K): boolean {
    return this.data.has(key);
  }

  *keys(): IterableIterator<K> {
    for (const key of this.order) {
      yield key;
    }
  }

  set(key: K, value: V): this {
    if (!this.data.has(key)) {
      this.order.push(key);
    }
    this.data.set(key, value);
    return this;
  }

  *values(): IterableIterator<V> {
    for (const key of this.order) {
      yield this.data.get(key)!;
    }
  }

  [Symbol.iterator](): IterableIterator<[K, V]> {
    return this.entries();
  }

  // array-inspired functions

  at(index: number): K | undefined {
    return this.order.at(index);
  }

  indexOf(key: K, fromIndex?: number): number {
    return this.order.indexOf(key, fromIndex);
  }

  splice(start: number, deleteCount?: number, ...items: [K, V][]): [K, V][] {
    let deletedKeys: K[];
    if (deleteCount !== undefined) {
      const newOrder = [...this.order];
      deletedKeys = newOrder.splice(
        start,
        deleteCount,
        ...items.map(([key]) => key),
      );
      for (const [key] of items) {
        if (this.data.has(key) && !deletedKeys.includes(key)) {
          throw new Error("Items contain existing key");
        }
      }
      this.order = newOrder;
    } else {
      deletedKeys = this.order.splice(start);
    }
    const deletedItems: [K, V][] = [];
    for (const deletedKey of deletedKeys) {
      const deletedValue = this.data.get(deletedKey)!;
      deletedItems.push([deletedKey, deletedValue]);
      this.data.delete(deletedKey);
    }
    if (deleteCount !== undefined) {
      for (const [key, value] of items) {
        this.data.set(key, value);
      }
    }
    return deletedItems;
  }
}
