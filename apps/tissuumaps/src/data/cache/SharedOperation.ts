import { AsyncUtils, type ProgressCallback } from "@tissuumaps/core";

/**
 * An abortable operation whose single run is shared by multiple callers
 *
 * The operation starts running as soon as it is constructed. Subscribers share
 * its result and its progress reports, and control its lifetime - see
 * {@link SharedOperation.subscribe}. Observers share result and progress as
 * well, but never keep the operation alive nor abandon it.
 *
 * An operation is never re-run: once it has rejected, its `failed` flag lets
 * callers replace it with a fresh operation.
 */
export class SharedOperation<TResult> {
  private readonly _promise: Promise<TResult>;
  private readonly _abortController = new AbortController();
  private readonly _subscribers = new Set<{ onProgress?: ProgressCallback }>();
  private readonly _observers = new Set<{ onProgress?: ProgressCallback }>();
  private _settled = false;
  private _failed = false;

  /**
   * @param run - Runs the operation, receiving the operation's abort signal and
   * a progress callback that fans out to all subscribers and observers
   */
  constructor(
    run: (options: {
      signal: AbortSignal;
      onProgress: ProgressCallback;
    }) => Promise<TResult>,
  ) {
    this._promise = run({
      signal: this._abortController.signal,
      onProgress: (progress, total) => {
        for (const subscriber of this._subscribers) {
          subscriber.onProgress?.(progress, total);
        }
        for (const observer of this._observers) {
          observer.onProgress?.(progress, total);
        }
      },
    });
    this._promise.then(
      () => {
        this._settled = true;
      },
      () => {
        this._settled = true;
        this._failed = true;
      },
    );
  }

  get signal(): AbortSignal {
    return this._abortController.signal;
  }

  get failed(): boolean {
    return this._failed;
  }

  /**
   * Waits for the operation's result, sharing it with all other subscribers
   *
   * Subscribers keep the operation alive: once the last one has gone away with
   * an aborted signal, and the operation has not settled yet, it is abandoned -
   * aborted, so that work nobody waits for anymore does not keep running. The
   * subscriber's own promise rejects right away either way; only the decision
   * to abandon the operation is deferred, by one macrotask, and taken again
   * once everything queued as a microtask has run.
   *
   * Callers therefore have to **reclaim the operation within the same task**,
   * not necessarily synchronously. A caller that gives up its subscription and
   * takes out a new one before the event loop turns keeps the operation: React
   * effects do, running all cleanups of a commit before all effects, and so
   * does a caller that resubscribes behind `await`s which resolve without
   * yielding - as a superseded WebGL synchronization pass does, whose data is
   * loaded and memoized by then. A caller that needs a timer, an
   * {@link AsyncUtils.yield} or fresh I/O to come back is genuinely gone, and
   * finds the operation abandoned and its result discarded.
   *
   * What that rules out is requesting things one at a time behind one's own
   * awaits: the gap between giving up and reclaiming then grows with the work
   * done in between, until it spans a task and the operation is lost. Loaders
   * therefore pass their abort signal on rather than awaiting around a request,
   * and the WebGL renderers issue every request of a pass before awaiting any
   * of them.
   *
   * @param options - Optional abort signal and progress callback
   * @returns A promise that resolves with the operation's result, or rejects
   * with the operation's error or the signal's reason
   */
  async subscribe(options?: {
    signal?: AbortSignal;
    onProgress?: ProgressCallback;
  }): Promise<TResult> {
    const { signal, onProgress } = options ?? {};
    const abortIfAbandoned = () => {
      if (signal?.aborted && this._subscribers.size === 0 && !this._settled) {
        // Defer to a macrotask and re-check, so that everything already queued
        // as a microtask runs first and a caller that gives up its subscription
        // only to take out a new one within the same task keeps the operation.
        // A timer is used rather than `AsyncUtils.yield()` because its ordering
        // against the timers callers wait on is well defined.
        setTimeout(() => {
          if (this._subscribers.size === 0 && !this._settled) {
            this.abort(signal.reason);
          }
        });
      }
    };
    abortIfAbandoned();
    signal?.throwIfAborted();
    const subscriber = { onProgress };
    this._subscribers.add(subscriber);
    try {
      return await AsyncUtils.raceSignal(this._promise, { signal });
    } finally {
      this._subscribers.delete(subscriber);
      abortIfAbandoned();
    }
  }

  /**
   * Waits for the operation's result without subscribing to it
   *
   * Unlike {@link SharedOperation.subscribe}, observing neither keeps the
   * operation alive nor abandons it, and cannot be cancelled: the returned
   * promise always settles with the operation's result or error.
   *
   * @param options - Optional progress callback
   * @returns A promise that resolves with the operation's result, or rejects
   * with the operation's error
   */
  observe(options?: { onProgress?: ProgressCallback }): Promise<TResult> {
    const { onProgress } = options ?? {};
    const observer = { onProgress };
    this._observers.add(observer);
    const removeObserver = () => {
      this._observers.delete(observer);
    };
    this._promise.then(removeObserver, removeObserver);
    return this._promise;
  }

  /**
   * Aborts the operation
   *
   * The operation's promise rejects as soon as its run function honors the
   * abort signal, and everyone waiting for the operation rejects with it.
   *
   * @param reason - The reason for aborting the operation
   */
  abort(reason?: unknown): void {
    this._abortController.abort(reason);
  }
}
