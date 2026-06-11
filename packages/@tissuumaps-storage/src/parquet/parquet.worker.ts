import { openParquetSource, readParquetColumn } from "./parquetDecode";
import { type ParquetState } from "./parquetDecode";
import { type ParquetWorkerRequest } from "./parquetProtocol";

// Minimal view of the dedicated worker global scope, cast from `self` to avoid a
// DOM/WebWorker lib clash in this single-lib (DOM) TS project.
interface DedicatedWorkerScope {
  postMessage(message: unknown, transfer?: Transferable[]): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ParquetWorkerRequest>) => void,
  ): void;
}
const ctx = self as unknown as DedicatedWorkerScope;

let state: ParquetState | undefined;

ctx.addEventListener("message", (event) => {
  void handleRequest(event.data);
});

async function handleRequest(request: ParquetWorkerRequest): Promise<void> {
  try {
    if (request.type === "open") {
      const opened = await openParquetSource(
        request.source,
        request.idColumn,
        request.nameColumn,
      );
      state = opened.state;
      ctx.postMessage({
        type: "result",
        id: request.id,
        result: opened.result,
      });
    } else {
      if (state === undefined) {
        throw new Error("Parquet worker received loadColumn before open");
      }
      const column = await readParquetColumn(state, request.column);
      const transfer = ArrayBuffer.isView(column)
        ? [column.buffer as ArrayBuffer]
        : [];
      ctx.postMessage(
        { type: "result", id: request.id, result: column },
        transfer,
      );
    }
  } catch (error) {
    ctx.postMessage({
      type: "error",
      id: request.id,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
