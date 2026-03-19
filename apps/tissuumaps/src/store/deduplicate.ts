export function deduplicate<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  F extends (...args: any[]) => Promise<any>,
>(f: F, getSignal?: (...args: Parameters<F>) => AbortSignal | undefined): F {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inFlightPromises = new Map<string, Promise<any>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (this: any, ...args: any[]): Promise<any> {
    // check if there's already a promise for these arguments
    const key = JSON.stringify(args);
    const inFlightPromise = inFlightPromises.get(key);
    if (inFlightPromise !== undefined) {
      return inFlightPromise;
    }
    // call the function and cache the promise
    const promise = f.apply(this, args).finally(() => {
      // delete the cached promise when it settles (either fulfills or rejects);
      // note that this microtask may run AFTER the caller has already called the function again,
      // so the caller may have already received the rejected-yet-still-cached promise at this point
      inFlightPromises.delete(key);
    });
    inFlightPromises.set(key, promise);
    // if a signal is provided, synchronously remove the cached promise when the signal is aborted;
    // this is necessary to prevent the caller from receiving a rejected-yet-still-cached promise (see above)
    if (getSignal !== undefined) {
      const signal = getSignal(...(args as Parameters<F>));
      if (signal !== undefined) {
        signal.addEventListener("abort", () => inFlightPromises.delete(key), {
          once: true,
        });
      }
    }
    return promise;
  } as F;
}
