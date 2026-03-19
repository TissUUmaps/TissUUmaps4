export function deduplicate<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (this: any, ...args: any[]) => Promise<any>,
>(f: F): F {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cachedPromises = new Map<string, Promise<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]): Promise<any> {
    const key = JSON.stringify(args);
    const cachedPromise = cachedPromises.get(key);
    if (cachedPromise !== undefined) {
      return cachedPromise;
    }
    const promise = f
      .apply(this, args)
      .finally(() => cachedPromises.delete(key));
    cachedPromises.set(key, promise);
    return promise;
  } as F;
}
