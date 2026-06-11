import { describe, expect, it } from "vitest";

import { ParquetWorkerClient } from "./ParquetWorkerClient";
import { type ParquetWorkerResponse } from "./parquetProtocol";

type PostedMessage = { message: unknown; transfer?: Transferable[] };

/** Minimal in-memory stand-in for a `Worker` that records posts and lets tests emit responses. */
class MockWorker {
  readonly posted: PostedMessage[] = [];
  terminated = false;
  private readonly _listeners = new Map<
    string,
    Set<(event: unknown) => void>
  >();

  addEventListener(type: string, listener: (event: unknown) => void): void {
    (
      this._listeners.get(type) ??
      this._listeners.set(type, new Set()).get(type)!
    ).add(listener);
  }

  removeEventListener(type: string, listener: (event: unknown) => void): void {
    this._listeners.get(type)?.delete(listener);
  }

  postMessage(message: unknown, transfer?: Transferable[]): void {
    this.posted.push({ message, transfer });
  }

  terminate(): void {
    this.terminated = true;
  }

  emitMessage(response: ParquetWorkerResponse): void {
    for (const listener of this._listeners.get("message") ?? []) {
      listener({ data: response });
    }
  }
}

function createClient(): { client: ParquetWorkerClient; worker: MockWorker } {
  const worker = new MockWorker();
  const client = new ParquetWorkerClient(worker as unknown as Worker);
  return { client, worker };
}

describe("ParquetWorkerClient", () => {
  it("sends an open request and resolves with the result", async () => {
    const { client, worker } = createClient();
    const promise = client.open(
      { kind: "url", url: "data.parquet" },
      { idColumn: "id" },
    );
    expect(worker.posted[0]!.message).toEqual({
      type: "open",
      id: 0,
      source: { kind: "url", url: "data.parquet" },
      idColumn: "id",
      nameColumn: undefined,
    });
    const result = { numRows: 3, columns: ["id", "x"], ids: [0, 1, 2] };
    worker.emitMessage({ type: "result", id: 0, result });
    await expect(promise).resolves.toEqual(result);
  });

  it("transfers the buffer for a buffer source", () => {
    const { client, worker } = createClient();
    const buffer = new ArrayBuffer(16);
    void client.open({ kind: "buffer", buffer });
    expect(worker.posted[0]!.transfer).toEqual([buffer]);
  });

  it("resolves loadColumn with the column data", async () => {
    const { client, worker } = createClient();
    const promise = client.loadColumn("x");
    expect(worker.posted[0]!.message).toEqual({
      type: "loadColumn",
      id: 0,
      column: "x",
    });
    const column = new Float32Array([1, 2, 3]);
    worker.emitMessage({ type: "result", id: 0, result: column });
    await expect(promise).resolves.toBe(column);
  });

  it("rejects on an error response", async () => {
    const { client, worker } = createClient();
    const promise = client.loadColumn("missing");
    worker.emitMessage({ type: "error", id: 0, message: "no such column" });
    await expect(promise).rejects.toThrow("no such column");
  });

  it("throws immediately when the signal is already aborted", async () => {
    const { client, worker } = createClient();
    const controller = new AbortController();
    controller.abort();
    await expect(
      client.loadColumn("x", { signal: controller.signal }),
    ).rejects.toThrow();
    expect(worker.posted).toHaveLength(0);
  });

  it("rejects on mid-flight abort and ignores the late response", async () => {
    const { client, worker } = createClient();
    const controller = new AbortController();
    const promise = client.loadColumn("x", { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toBeDefined();
    // A late worker reply for the aborted request must be ignored, not throw.
    expect(() =>
      worker.emitMessage({
        type: "result",
        id: 0,
        result: new Float32Array([1]),
      }),
    ).not.toThrow();
  });

  it("terminates the worker and rejects pending requests on close", async () => {
    const { client, worker } = createClient();
    const promise = client.loadColumn("x");
    client.close();
    expect(worker.terminated).toBe(true);
    await expect(promise).rejects.toThrow("terminated");
  });
});
