import type {
  ParquetWorkerRequest,
  ParquetWorkerResponse,
  ParquetWorkerResponseFor,
  ParquetWorkerResponseMessage,
} from "./parquet.worker";
import ParquetWorker from "./parquet.worker?worker&inline";

type PendingRequest = {
  resolve: (response: ParquetWorkerResponse) => void;
  reject: (error: Error) => void;
  signal?: AbortSignal;
  onAbort?: () => void;
};

export class ParquetWorkerClient {
  private readonly _worker: Worker;
  private readonly _pendingRequests = new Map<number, PendingRequest>();
  private _nextRequestId = 0;
  private _terminated = false;

  constructor() {
    this._worker = new ParquetWorker();
    this._worker.onmessage = (
      event: MessageEvent<ParquetWorkerResponseMessage>,
    ) => {
      const { id } = event.data;
      const pendingRequest = this._pendingRequests.get(id);
      if (pendingRequest !== undefined) {
        if (
          pendingRequest.signal !== undefined &&
          pendingRequest.onAbort !== undefined
        ) {
          pendingRequest.signal.removeEventListener(
            "abort",
            pendingRequest.onAbort,
          );
        }
        if ("error" in event.data) {
          pendingRequest.reject(new Error(event.data.error));
        } else {
          pendingRequest.resolve(event.data);
        }
        this._pendingRequests.delete(id);
      }
    };
    this._worker.onerror = (event) => {
      for (const pendingRequest of this._pendingRequests.values()) {
        if (
          pendingRequest.signal !== undefined &&
          pendingRequest.onAbort !== undefined
        ) {
          pendingRequest.signal.removeEventListener(
            "abort",
            pendingRequest.onAbort,
          );
        }
        pendingRequest.reject(new Error(event.message));
      }
      this._pendingRequests.clear();
    };
  }

  async run<TRequest extends ParquetWorkerRequest>(
    request: TRequest,
    options?: { signal?: AbortSignal },
  ): Promise<ParquetWorkerResponseFor<TRequest>> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    if (this._terminated) {
      throw new DOMException(
        "Parquet worker has been terminated",
        "AbortError",
      );
    }
    const id = this._nextRequestId++;
    const result = await new Promise<ParquetWorkerResponse>(
      (resolve, reject) => {
        const onAbort = () => {
          pendingRequest.signal!.removeEventListener("abort", onAbort);
          this._pendingRequests.delete(id);
          reject(signal!.reason as Error);
        };
        const pendingRequest: PendingRequest = {
          resolve,
          reject,
          signal,
          onAbort,
        };
        this._pendingRequests.set(id, pendingRequest);
        signal?.addEventListener("abort", onAbort, { once: true });
        this._worker.postMessage({ ...request, id });
      },
    );
    return result as ParquetWorkerResponseFor<TRequest>;
  }

  terminate(): void {
    this._terminated = true;
    for (const pendingRequest of this._pendingRequests.values()) {
      if (
        pendingRequest.signal !== undefined &&
        pendingRequest.onAbort !== undefined
      ) {
        pendingRequest.signal.removeEventListener(
          "abort",
          pendingRequest.onAbort,
        );
      }
      pendingRequest.reject(
        new DOMException("Parquet worker has been terminated.", "AbortError"),
      );
    }
    this._pendingRequests.clear();
    this._worker.terminate();
  }
}
