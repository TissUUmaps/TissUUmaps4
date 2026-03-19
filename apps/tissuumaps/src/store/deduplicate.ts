export function deduplicate<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (this: any, ...args: any[]) => Promise<any>,
>(f: F): F {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const promises = new Map<string, Promise<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]): Promise<any> {
    const key = JSON.stringify(args);
    let promise = promises.get(key);
    if (promise !== undefined) {
      return promise;
    }
    promise = f.apply(this, args).finally(() => promises.delete(key));
    promises.set(key, promise);
    return promise;
  } as F;
}
