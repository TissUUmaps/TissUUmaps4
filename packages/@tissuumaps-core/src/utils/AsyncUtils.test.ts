import { describe, expect, it, vi } from "vitest";

import { AsyncUtils } from "./AsyncUtils";

describe("AsyncUtils.yield", () => {
  it("resolves", async () => {
    await expect(AsyncUtils.yield()).resolves.toBeUndefined();
  });

  it("resolves concurrent waiters in order", async () => {
    const order: number[] = [];
    await Promise.all([
      AsyncUtils.yield().then(() => order.push(0)),
      AsyncUtils.yield().then(() => order.push(1)),
      AsyncUtils.yield().then(() => order.push(2)),
    ]);
    expect(order).toEqual([0, 1, 2]);
  });
});

describe("AsyncUtils.forEach", () => {
  it("invokes body with each item and index in order", async () => {
    const seen: [string, number][] = [];
    await AsyncUtils.forEach(["a", "b", "c"], (item, i) => {
      seen.push([item, i]);
    });
    expect(seen).toEqual([
      ["a", 0],
      ["b", 1],
      ["c", 2],
    ]);
  });

  it("does nothing for an empty collection", async () => {
    const body = vi.fn();
    await AsyncUtils.forEach([], body);
    expect(body).not.toHaveBeenCalled();
  });

  it("supports typed arrays", async () => {
    const seen: number[] = [];
    await AsyncUtils.forEach(new Uint32Array([10, 20, 30]), (item) => {
      seen.push(item);
    });
    expect(seen).toEqual([10, 20, 30]);
  });

  it("covers items spanning multiple chunks", async () => {
    const items = Array.from({ length: 11 }, (_, i) => i);
    let count = 0;
    let last = -1;
    await AsyncUtils.forEach(
      items,
      (item, i) => {
        expect(i).toBe(last + 1);
        expect(item).toBe(i);
        last = i;
        count++;
      },
      { yieldMs: -1, checkEvery: 4 },
    );
    expect(count).toBe(items.length);
    expect(last).toBe(items.length - 1);
  });

  it("throws immediately when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const body = vi.fn();
    await expect(
      AsyncUtils.forEach([1, 2, 3], body, { signal: controller.signal }),
    ).rejects.toThrow();
    expect(body).not.toHaveBeenCalled();
  });

  it("stops and rejects when aborted mid-iteration", async () => {
    const controller = new AbortController();
    const seen: number[] = [];
    const items = Array.from({ length: 16 }, (_, i) => i);
    const promise = AsyncUtils.forEach(
      items,
      (item) => {
        seen.push(item);
        if (item === 3) {
          controller.abort();
        }
      },
      { signal: controller.signal, yieldMs: -1, checkEvery: 4 },
    );
    await expect(promise).rejects.toThrow();
    // The first chunk (4 items) runs fully, then the post-yield abort check stops it.
    expect(seen.length).toBe(4);
  });
});

describe("AsyncUtils.createYielder", () => {
  it("yields when the time budget is exceeded", async () => {
    const yielder = AsyncUtils.createYielder({ yieldMs: -1 });
    // yieldMs < 0 means every call exceeds the budget and yields.
    await expect(yielder()).resolves.toBeUndefined();
  });

  it("is a no-op while within the time budget", async () => {
    const yielder = AsyncUtils.createYielder({ yieldMs: 60_000 });
    await expect(yielder()).resolves.toBeUndefined();
  });

  it("throws on the abort check after yielding", async () => {
    const controller = new AbortController();
    const yielder = AsyncUtils.createYielder({
      signal: controller.signal,
      yieldMs: -1,
    });
    controller.abort();
    await expect(yielder()).rejects.toThrow();
  });

  it("throws on the abort check even while within budget", async () => {
    const controller = new AbortController();
    const yielder = AsyncUtils.createYielder({
      signal: controller.signal,
      yieldMs: 60_000,
    });
    controller.abort();
    await expect(yielder()).rejects.toThrow();
  });
});
