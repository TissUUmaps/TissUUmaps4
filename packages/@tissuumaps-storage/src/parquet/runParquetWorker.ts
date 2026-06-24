import type {
  ParquetWorkerRequest,
  ParquetWorkerResponse,
  ParquetWorkerResponseFor,
} from "./parquet.worker";
import ParquetWorker from "./parquet.worker?worker&inline";

export async function runParquetWorker<TRequest extends ParquetWorkerRequest>(
  request: TRequest,
  options?: { signal?: AbortSignal },
): Promise<ParquetWorkerResponseFor<TRequest>> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const worker = new ParquetWorker();
  return await new Promise((resolve, reject) => {
    const onAbort = () => {
      worker.terminate();
      reject(signal!.reason as Error);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (event: MessageEvent<ParquetWorkerResponse>) => {
      worker.terminate();
      signal?.removeEventListener("abort", onAbort);
      if ("error" in event.data) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data as ParquetWorkerResponseFor<TRequest>);
      }
    };
    worker.onerror = (event) => {
      worker.terminate();
      signal?.removeEventListener("abort", onAbort);
      reject(new Error(event.message));
    };
    worker.postMessage(request);
  });
}
