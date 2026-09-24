import { describe, expect, it } from "vitest";

import { WorkerChannel } from "./WorkerChannel";
import type { HierarchicalTableWorkerResponseMessage } from "./messages";

function createFakeWorker() {
  return {
    messages: [] as unknown[],
    terminateCalls: 0,
    onmessage: null as ((event: MessageEvent) => void) | null,
    onerror: null as ((event: ErrorEvent) => void) | null,
    onmessageerror: null as ((event: MessageEvent) => void) | null,
    postMessage(message: unknown) {
      this.messages.push(message);
    },
    terminate() {
      this.terminateCalls++;
    },
    respond(data: HierarchicalTableWorkerResponseMessage) {
      this.onmessage!({ data } as MessageEvent);
    },
  };
}

function createChannel() {
  const worker = createFakeWorker();
  const channel = new WorkerChannel(worker as unknown as Worker);
  return { worker, channel };
}

describe("WorkerChannel", () => {
  describe("request", () => {
    it("posts the request with increasing ids", () => {
      const { worker, channel } = createChannel();
      void channel.request({ op: "range", column: "a" });
      void channel.request({ op: "column", column: "b", numRows: 3 });
      expect(worker.messages).toEqual([
        { op: "range", column: "a", id: 0 },
        { op: "column", column: "b", numRows: 3, id: 1 },
      ]);
    });

    it("resolves with the response of the matching id, without the id", async () => {
      const { worker, channel } = createChannel();
      const first = channel.request({ op: "range", column: "a" });
      const second = channel.request({ op: "range", column: "b" });
      worker.respond({ id: 1, range: [2, 3] });
      worker.respond({ id: 0, range: [0, 1] });
      await expect(first).resolves.toEqual({ range: [0, 1] });
      await expect(second).resolves.toEqual({ range: [2, 3] });
    });

    it("rejects with the message of an error response", async () => {
      const { worker, channel } = createChannel();
      const request = channel.request({ op: "column", column: "a" });
      worker.respond({ id: 0, error: "No such column" });
      await expect(request).rejects.toThrow(new Error("No such column"));
    });

    it("ignores a response without a pending request", () => {
      const { worker } = createChannel();
      expect(() => worker.respond({ id: 7, range: undefined })).not.toThrow();
    });

    it("rejects with the abort reason and ignores the late response", async () => {
      const { worker, channel } = createChannel();
      const controller = new AbortController();
      const reason = new Error("aborted");
      const request = channel.request(
        { op: "range", column: "a" },
        { signal: controller.signal },
      );
      controller.abort(reason);
      await expect(request).rejects.toBe(reason);
      expect(() => worker.respond({ id: 0, range: [0, 1] })).not.toThrow();
    });

    it("rejects without posting when the signal is already aborted", async () => {
      const { worker, channel } = createChannel();
      const reason = new Error("aborted");
      await expect(
        channel.request(
          { op: "range", column: "a" },
          { signal: AbortSignal.abort(reason) },
        ),
      ).rejects.toBe(reason);
      expect(worker.messages).toEqual([]);
    });

    it("ignores an abort after the response", async () => {
      const { worker, channel } = createChannel();
      const controller = new AbortController();
      const request = channel.request(
        { op: "range", column: "a" },
        { signal: controller.signal },
      );
      worker.respond({ id: 0, range: [0, 1] });
      controller.abort();
      await expect(request).resolves.toEqual({ range: [0, 1] });
    });

    it("rejects when the worker has been terminated", async () => {
      const { worker, channel } = createChannel();
      channel.terminate();
      await expect(
        channel.request({ op: "range", column: "a" }),
      ).rejects.toThrow("Worker has been terminated");
      expect(worker.messages).toEqual([]);
    });
  });

  describe("onerror", () => {
    it("rejects all pending requests and terminates the worker", async () => {
      const { worker, channel } = createChannel();
      const first = channel.request({ op: "range", column: "a" });
      const second = channel.request({ op: "range", column: "b" });
      worker.onerror!({ message: "Worker crashed" } as ErrorEvent);
      await expect(first).rejects.toThrow("Worker crashed");
      await expect(second).rejects.toThrow("Worker crashed");
      expect(worker.terminateCalls).toBe(1);
    });
  });

  describe("onmessageerror", () => {
    it("rejects all pending requests and terminates the worker", async () => {
      const { worker, channel } = createChannel();
      const first = channel.request({ op: "range", column: "a" });
      const second = channel.request({ op: "range", column: "b" });
      worker.onmessageerror!({} as MessageEvent);
      await expect(first).rejects.toThrow(
        "Failed to deserialize worker response.",
      );
      await expect(second).rejects.toThrow(
        "Failed to deserialize worker response.",
      );
      expect(worker.terminateCalls).toBe(1);
    });
  });

  describe("terminate", () => {
    it("rejects pending requests and terminates the worker once", async () => {
      const { worker, channel } = createChannel();
      const request = channel.request({ op: "range", column: "a" });
      channel.terminate();
      channel.terminate();
      await expect(request).rejects.toThrow("Worker has been terminated");
      expect(worker.terminateCalls).toBe(1);
    });
  });
});
