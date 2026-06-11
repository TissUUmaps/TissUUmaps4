import { parseGeoJSON } from "./geojsonParse";
import { type GeoJSONRequest } from "./geojsonProtocol";

// Minimal view of the dedicated worker global scope, cast from `self` to avoid a
// DOM/WebWorker lib clash in this single-lib (DOM) TS project.
interface DedicatedWorkerScope {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<GeoJSONRequest>) => void,
  ): void;
}
const ctx = self as unknown as DedicatedWorkerScope;

ctx.addEventListener("message", (event) => {
  void handleRequest(event.data);
});

async function handleRequest(request: GeoJSONRequest): Promise<void> {
  try {
    let text: string;
    if (request.source.kind === "buffer") {
      text = new TextDecoder().decode(request.source.buffer);
    } else {
      const response = await fetch(request.source.url);
      if (!response.ok) {
        throw new Error(
          `Failed to load GeoJSON from ${request.source.url}: ${response.status} ${response.statusText}`,
        );
      }
      text = await response.text();
    }
    const { geometry, ids, names } = parseGeoJSON(
      text,
      request.idProperty,
      request.nameProperty,
    );
    ctx.postMessage({ type: "result", result: { geometry, ids, names } }, [
      geometry.coords.buffer,
      geometry.ringVertexOffsets.buffer,
      geometry.polygonRingOffsets.buffer,
      geometry.shapePolygonOffsets.buffer,
    ]);
  } catch (error) {
    ctx.postMessage({
      type: "error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
