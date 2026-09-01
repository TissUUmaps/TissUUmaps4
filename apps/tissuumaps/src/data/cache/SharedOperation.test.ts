import { StrictMode, act, createElement, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi } from "vitest";

import type { ProgressCallback } from "@tissuumaps/core";

import { SharedOperation } from "./SharedOperation";

// `act` requires this flag, which the application itself never sets
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Options = { signal: AbortSignal; onProgress: ProgressCallback };

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Lets every pending microtask and job queued by a settled promise run */
async function flushAsync(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** Resolves with the rejection reason, or fails if the promise resolves */
function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error("Expected the promise to reject");
    },
    (error: unknown) => error,
  );
}

/**
 * Creates a {@link SharedOperation} that stays pending until the
 * returned deferred is settled, exposing the options the run was called with
 * and a spy on the abort event of the operation's signal.
 */
function createOp<TResult>() {
  const deferred = createDeferred<TResult>();
  let capturedOptions: Options | undefined;
  const run = vi.fn((options: Options) => {
    capturedOptions = options;
    return deferred.promise;
  });
  const op = new SharedOperation<TResult>(run);
  // the operation is invoked synchronously by the constructor
  const onAbort = vi.fn();
  op.signal.addEventListener("abort", onAbort, { once: true });
  return { op, run, onAbort, deferred, options: capturedOptions! };
}

describe("SharedOperation", () => {
  describe("constructor", () => {
    it("starts the operation immediately with a pending signal", () => {
      const { run, options } = createOp<string>();

      expect(run).toHaveBeenCalledOnce();
      expect(options.signal.aborted).toBe(false);
      expect(typeof options.onProgress).toBe("function");
    });

    it("exposes an unaborted signal while the operation is pending", () => {
      const { op, onAbort } = createOp<string>();

      expect(op.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();
    });

    it("run without using the options", async () => {
      const deferred = createDeferred<string>();
      const op = new SharedOperation(() => deferred.promise);

      const promise = op.subscribe();
      deferred.resolve("result");

      await expect(promise).resolves.toBe("result");
    });
  });

  describe("subscribe", () => {
    it("resolves with the operation result", async () => {
      const { op, deferred } = createOp<string>();

      const promise = op.subscribe();
      deferred.resolve("result");

      await expect(promise).resolves.toBe("result");
    });

    it("resolves every subscriber with the same result", async () => {
      const { op, run, deferred } = createOp<string>();

      const first = op.subscribe();
      const second = op.subscribe();
      deferred.resolve("result");

      await expect(Promise.all([first, second])).resolves.toEqual([
        "result",
        "result",
      ]);
      expect(run).toHaveBeenCalledOnce();
    });

    it("resolves a subscriber that arrives after the operation settled", async () => {
      const { op, run, deferred } = createOp<string>();

      deferred.resolve("result");
      await op.subscribe();

      await expect(op.subscribe()).resolves.toBe("result");
      expect(run).toHaveBeenCalledOnce();
    });

    it("forwards progress to all subscribers", async () => {
      const { op, deferred, options } = createOp<string>();
      const firstOnProgress = vi.fn();
      const secondOnProgress = vi.fn();

      const first = op.subscribe({ onProgress: firstOnProgress });
      const second = op.subscribe({ onProgress: secondOnProgress });
      options.onProgress(2, 5);

      expect(firstOnProgress).toHaveBeenCalledWith(2, 5);
      expect(secondOnProgress).toHaveBeenCalledWith(2, 5);

      deferred.resolve("result");
      await Promise.all([first, second]);
    });

    it("tolerates a subscriber without a progress callback", async () => {
      const { op, deferred, options } = createOp<string>();
      const onProgress = vi.fn();

      const silent = op.subscribe();
      const promise = op.subscribe({ onProgress });

      expect(() => {
        options.onProgress(1, 2);
      }).not.toThrow();
      expect(onProgress).toHaveBeenCalledWith(1, 2);

      deferred.resolve("result");
      await Promise.all([silent, promise]);
    });

    it("stops forwarding progress once a subscriber has resolved", async () => {
      const { op, deferred, options } = createOp<string>();
      const onProgress = vi.fn();

      const promise = op.subscribe({ onProgress });
      deferred.resolve("result");
      await promise;
      options.onProgress(1, 2);

      expect(onProgress).not.toHaveBeenCalled();
    });

    it("stops forwarding progress to a subscriber that aborted", async () => {
      const { op, deferred, options } = createOp<string>();
      const abortedOnProgress = vi.fn();
      const onProgress = vi.fn();
      const controller = new AbortController();

      const aborted = op.subscribe({
        signal: controller.signal,
        onProgress: abortedOnProgress,
      });
      const promise = op.subscribe({ onProgress });
      controller.abort();
      await captureRejection(aborted);
      options.onProgress(1, 2);

      expect(abortedOnProgress).not.toHaveBeenCalled();
      expect(onProgress).toHaveBeenCalledWith(1, 2);

      deferred.resolve("result");
      await promise;
    });

    it("rejects every subscriber with the operation failure unchanged", async () => {
      const { op, deferred } = createOp<string>();
      const failure = new Error("boom");

      const first = op.subscribe();
      const second = op.subscribe();
      deferred.reject(failure);

      expect(await captureRejection(first)).toBe(failure);
      expect(await captureRejection(second)).toBe(failure);
    });

    it("rejects a subscriber with an AbortError when its signal aborts", async () => {
      const { op } = createOp<string>();
      const controller = new AbortController();

      const promise = op.subscribe({ signal: controller.signal });
      controller.abort();
      const error = await captureRejection(promise);

      expect((error as DOMException).name).toBe("AbortError");
    });

    it("aborts the operation when the last subscriber aborts", async () => {
      const { op, onAbort, options } = createOp<string>();
      const controller = new AbortController();
      const error = new Error("no longer needed");

      const promise = op.subscribe({ signal: controller.signal });
      controller.abort(error);
      await captureRejection(promise);
      await flushAsync(); // abandonment is decided one macrotask later

      expect(options.signal.aborted).toBe(true);
      expect(options.signal.reason).toBe(error);
      expect(onAbort).toHaveBeenCalledOnce();
    });

    it("keeps the operation running while another subscriber remains", async () => {
      const { op, onAbort, deferred, options } = createOp<string>();
      const controller = new AbortController();

      const aborted = op.subscribe({ signal: controller.signal });
      const remaining = op.subscribe();
      controller.abort();
      await captureRejection(aborted);

      expect(options.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();

      deferred.resolve("result");

      await expect(remaining).resolves.toBe("result");
    });

    it("rejects with the abort reason when the signal is already aborted", async () => {
      const { op } = createOp<string>();
      const controller = new AbortController();
      const error = new Error("too late");
      controller.abort(error);

      const returnedError = await captureRejection(
        op.subscribe({ signal: controller.signal }),
      );

      expect(returnedError).toBe(error);
    });

    it("aborts the operation when the first subscriber is already aborted", async () => {
      const { op, onAbort, options } = createOp<string>();
      const controller = new AbortController();
      const error = new Error("too late");
      controller.abort(error);

      await captureRejection(op.subscribe({ signal: controller.signal }));
      await flushAsync(); // abandonment is decided one macrotask later

      expect(options.signal.aborted).toBe(true);
      expect(options.signal.reason).toBe(error);
      expect(onAbort).toHaveBeenCalledOnce();
    });

    it("keeps the operation running when a later subscriber is already aborted", async () => {
      const { op, onAbort, deferred, options } = createOp<string>();
      const controller = new AbortController();
      controller.abort();

      const remaining = op.subscribe();
      await captureRejection(op.subscribe({ signal: controller.signal }));

      expect(options.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();

      deferred.resolve("result");

      await expect(remaining).resolves.toBe("result");
    });

    it("does not abort an already settled operation for an aborted subscriber", async () => {
      const { op, onAbort, deferred, options } = createOp<string>();
      const controller = new AbortController();
      controller.abort();

      deferred.resolve("result");
      await op.subscribe();
      await captureRejection(op.subscribe({ signal: controller.signal }));

      expect(options.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();
    });
  });

  describe("observe", () => {
    it("resolves with the operation result", async () => {
      const { op, deferred } = createOp<string>();

      const promise = op.observe();
      deferred.resolve("result");

      await expect(promise).resolves.toBe("result");
    });

    it("rejects with the operation failure unchanged", async () => {
      const { op, deferred } = createOp<string>();
      const failure = new Error("boom");

      const promise = op.observe();
      deferred.reject(failure);

      expect(await captureRejection(promise)).toBe(failure);
    });

    it("forwards progress to the observer", async () => {
      const { op, deferred, options } = createOp<string>();
      const onProgress = vi.fn();

      const promise = op.observe({ onProgress });
      options.onProgress(2, 5);

      expect(onProgress).toHaveBeenCalledWith(2, 5);

      deferred.resolve("result");
      await promise;
    });

    it("stops forwarding progress once the operation settled", async () => {
      const { op, deferred, options } = createOp<string>();
      const onProgress = vi.fn();

      const promise = op.observe({ onProgress });
      deferred.resolve("result");
      await promise;
      options.onProgress(1, 2);

      expect(onProgress).not.toHaveBeenCalled();
    });

    it("does not keep the operation alive for an aborted subscriber", async () => {
      const { op, onAbort, deferred } = createOp<string>();
      const controller = new AbortController();

      const observed = op.observe();
      const subscribed = op.subscribe({ signal: controller.signal });
      controller.abort();
      await captureRejection(subscribed);
      await flushAsync(); // abandonment is decided one macrotask later

      expect(onAbort).toHaveBeenCalledOnce();

      // the observer keeps following the operation it does not keep alive
      deferred.resolve("result");

      await expect(observed).resolves.toBe("result");
    });
  });

  describe("abort", () => {
    it("aborts the operation signal and notifies its listeners", () => {
      const { op, onAbort, options } = createOp<string>();
      const error = new Error("closed");

      op.abort(error);

      expect(options.signal.aborted).toBe(true);
      expect(options.signal.reason).toBe(error);
      expect(onAbort).toHaveBeenCalledOnce();
    });

    it("notifies its listeners only once when aborted repeatedly", () => {
      const { op, onAbort } = createOp<string>();

      op.abort();
      op.abort(new Error("closed"));

      expect(onAbort).toHaveBeenCalledOnce();
    });

    it("keeps the first abort reason when aborted repeatedly", () => {
      const { op, options } = createOp<string>();
      const error = new Error("closed");

      op.abort(error);
      op.abort(new Error("closed again"));

      expect(options.signal.reason).toBe(error);
    });

    it("leaves subscribers pending until the aborted operation rejects", async () => {
      const { op, deferred, options } = createOp<string>();
      const settled = vi.fn();

      const promise = op.subscribe();
      promise.then(settled, settled);
      op.abort(new Error("closed"));
      await flushAsync();

      expect(settled).not.toHaveBeenCalled();
      expect(options.signal.aborted).toBe(true);

      const failure = new Error("aborted operation");
      deferred.reject(failure);

      expect(await captureRejection(promise)).toBe(failure);
    });
  });

  describe("operation settlement", () => {
    it("does not abort the operation signal when the operation fails", async () => {
      const { op, onAbort, deferred, options } = createOp<string>();
      const failure = new Error("boom");

      deferred.reject(failure);
      expect(await captureRejection(op.subscribe())).toBe(failure);
      await flushAsync();

      expect(options.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();
    });

    it("does not abort the operation signal when the operation succeeds", async () => {
      const { op, onAbort, deferred, options } = createOp<string>();

      deferred.resolve("result");
      await op.subscribe();
      await flushAsync();

      expect(options.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();
    });

    it("rejects a subscriber that arrives after the operation failed", async () => {
      const { op, run, deferred } = createOp<string>();
      const failure = new Error("boom");

      deferred.reject(failure);
      await captureRejection(op.subscribe());

      expect(await captureRejection(op.subscribe())).toBe(failure);
      expect(run).toHaveBeenCalledOnce();
    });

    it("does not abort a failed operation for an aborted subscriber", async () => {
      const { op, onAbort, deferred, options } = createOp<string>();
      const controller = new AbortController();
      controller.abort();

      deferred.reject(new Error("boom"));
      await captureRejection(op.subscribe());
      await captureRejection(op.subscribe({ signal: controller.signal }));

      expect(options.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();
    });
  });

  // Guards the contract documented on `subscribe`: consumers claim an operation
  // synchronously, so that React tearing an effect down and setting it up again
  // in one commit never drops the subscriber count to zero. Breaking it - by
  // awaiting anything before subscribing - turns every effect re-run into a
  // cancelled and restarted load, which no unit test above would catch.
  describe("React consumers", () => {
    /** Subscribes for as long as it is mounted, resubscribing when `dep` changes */
    function createConsumer<TResult>(op: SharedOperation<TResult>) {
      return function Consumer({ dep }: { dep: number }) {
        useEffect(() => {
          const abortController = new AbortController();
          void dep;
          op.subscribe({ signal: abortController.signal }).catch(() => {
            // ignored, the operation's outcome is asserted on directly
          });
          return () => abortController.abort();
        }, [dep]);
        return null;
      };
    }

    function renderConsumers<TResult>(
      op: SharedOperation<TResult>,
      count: number,
    ) {
      const Consumer = createConsumer(op);
      const container = document.createElement("div");
      document.body.appendChild(container);
      const root = createRoot(container);
      const render = (dep: number) => {
        act(() => {
          root.render(
            createElement(
              StrictMode,
              null,
              ...Array.from({ length: count }, (_, i) =>
                createElement(Consumer, { key: i, dep }),
              ),
            ),
          );
        });
      };
      render(0);
      return {
        render,
        unmount: () => {
          act(() => {
            root.unmount();
          });
          container.remove();
        },
      };
    }

    it("keeps the operation running when every consumer's effect re-runs", async () => {
      const { op, onAbort, deferred, options } = createOp<string>();
      const { render, unmount } = renderConsumers(op, 2);

      // every effect is torn down and set up again within the same commit
      render(1);
      await flushAsync(); // let any abandonment check run before asserting

      expect(options.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();

      deferred.resolve("result");
      await flushAsync();
      unmount();
      await flushAsync();

      expect(options.signal.aborted).toBe(false);
      expect(onAbort).not.toHaveBeenCalled();
    });

    it("abandons the operation once the last consumer unmounts", async () => {
      const { op, onAbort, options } = createOp<string>();
      const { unmount } = renderConsumers(op, 2);

      unmount();
      await flushAsync(); // the subscribers settle
      await flushAsync(); // the deferred abandonment check runs

      expect(options.signal.aborted).toBe(true);
      expect(onAbort).toHaveBeenCalledOnce();
    });
  });
});
