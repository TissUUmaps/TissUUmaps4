import {
  type ParquetColumnData,
  type ParquetOpenResult,
  type ParquetSource,
  type ParquetWorkerRequest,
  type ParquetWorkerResponse,
} from "./parquetProtocol";

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: Error) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
};

/**
 * Main-thread RPC client over a Parquet decode worker.
 *
 * The `Worker` is injected so this class is free of any bundler-specific worker
 * import and can be unit-tested with a mock. Requests are matched to responses
 * by an incrementing id; typed-array column buffers are transferred (zero-copy).
 */
export class ParquetWorkerClient {
  private readonly _worker: Worker;
  private readonly _pending = new Map<number, PendingRequest>();
  private _nextId = 0;

  constructor(worker: Worker) {
    this._worker = worker;
    this._worker.addEventListener("message", this._onMessage);
    this._worker.addEventListener("error", this._onError);
  }

  async open(
    source: ParquetSource,
    options?: { idColumn?: string; nameColumn?: string; signal?: AbortSignal },
  ): Promise<ParquetOpenResult> {
    const { idColumn, nameColumn, signal } = options ?? {};
    const transfer = source.kind === "buffer" ? [source.buffer] : [];
    const result = await this._request(
      (id) => ({ type: "open", id, source, idColumn, nameColumn }),
      transfer,
      signal,
    );
    return result as ParquetOpenResult;
  }

  async loadColumn(
    column: string,
    options?: { signal?: AbortSignal },
  ): Promise<ParquetColumnData> {
    const { signal } = options ?? {};
    const result = await this._request(
      (id) => ({ type: "loadColumn", id, column }),
      [],
      signal,
    );
    return result as ParquetColumnData;
  }

  close(): void {
    this._worker.removeEventListener("message", this._onMessage);
    this._worker.removeEventListener("error", this._onError);
    this._worker.terminate();
    for (const pending of this._pending.values()) {
      this._cleanup(pending);
      pending.reject(new Error("Parquet worker terminated"));
    }
    this._pending.clear();
  }

  private _request(
    build: (id: number) => ParquetWorkerRequest,
    transfer: Transferable[],
    signal?: AbortSignal,
  ): Promise<unknown> {
    signal?.throwIfAborted();
    const id = this._nextId++;
    return new Promise<unknown>((resolve, reject) => {
      const pending: PendingRequest = { resolve, reject, signal };
      if (signal !== undefined) {
        pending.onAbort = () => {
          this._pending.delete(id);
          const reason: unknown = signal.reason;
          reject(
            reason instanceof Error ? reason : new Error("Request aborted"),
          );
        };
        signal.addEventListener("abort", pending.onAbort, { once: true });
      }
      this._pending.set(id, pending);
      this._worker.postMessage(build(id), transfer);
    });
  }

  private _cleanup(pending: PendingRequest): void {
    if (pending.signal !== undefined && pending.onAbort !== undefined) {
      pending.signal.removeEventListener("abort", pending.onAbort);
    }
  }

  private readonly _onMessage = (
    event: MessageEvent<ParquetWorkerResponse>,
  ): void => {
    const response = event.data;
    const pending = this._pending.get(response.id);
    if (pending === undefined) {
      return; // already settled or aborted
    }
    this._pending.delete(response.id);
    this._cleanup(pending);
    if (response.type === "error") {
      pending.reject(new Error(response.message));
    } else {
      pending.resolve(response.result);
    }
  };

  private readonly _onError = (event: ErrorEvent): void => {
    const reason: unknown = event.error;
    const error = reason instanceof Error ? reason : new Error(event.message);
    for (const pending of this._pending.values()) {
      this._cleanup(pending);
      pending.reject(error);
    }
    this._pending.clear();
  };
}
