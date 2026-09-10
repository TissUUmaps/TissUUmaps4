import { getDecoder } from "geotiff";

// Decoder worker for geotiff.js's Pool. geotiff.js inlines its own worker as a
// string, which cannot pick up our patches; this one imports the patched code.

type Job = {
  jobId: number;
  compression: number;
  decoderParameters: Parameters<typeof getDecoder>[1];
  buffer: ArrayBuffer;
};

type Result =
  | { jobId: number; decoded: ArrayBufferLike }
  | { jobId: number; error: string };

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<Job>) => void) | null;
  postMessage: (message: Result, transfer?: Transferable[]) => void;
};

ctx.onmessage = (event) => {
  void (async () => {
    const { jobId, compression, decoderParameters, buffer } = event.data;
    try {
      const decoder = await getDecoder(compression, decoderParameters);
      const decoded = await decoder.decode(buffer);
      ctx.postMessage({ jobId, decoded }, [decoded as ArrayBuffer]);
    } catch (error) {
      // an empty message would read as success to the pool
      const message = error instanceof Error ? error.message || error.name : "";
      ctx.postMessage({ jobId, error: message || String(error) });
    }
  })();
};
