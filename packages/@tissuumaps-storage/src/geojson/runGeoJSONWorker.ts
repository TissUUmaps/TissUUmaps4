import type {
  GeoJSONWorkerRequest,
  GeoJSONWorkerResponse,
  GeoJSONWorkerResponseFor,
} from "./geojson.worker";
import GeoJSONWorker from "./geojson.worker?worker&inline";

export async function runGeoJSONWorker<TRequest extends GeoJSONWorkerRequest>(
  request: TRequest,
  options?: { signal?: AbortSignal },
): Promise<GeoJSONWorkerResponseFor<TRequest>> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  const worker = new GeoJSONWorker();
  return await new Promise((resolve, reject) => {
    const onAbort = () => {
      worker.terminate();
      reject(signal!.reason as Error);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (event: MessageEvent<GeoJSONWorkerResponse>) => {
      worker.terminate();
      signal?.removeEventListener("abort", onAbort);
      if ("error" in event.data) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data as GeoJSONWorkerResponseFor<TRequest>);
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
