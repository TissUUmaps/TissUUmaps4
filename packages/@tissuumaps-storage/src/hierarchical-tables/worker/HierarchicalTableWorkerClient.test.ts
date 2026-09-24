import { describe, expect, it } from "vitest";

import type { HierarchicalTableColumn } from "../HierarchicalTable";
import { HierarchicalTableWorkerClient } from "./HierarchicalTableWorkerClient";
import type { HierarchicalTableWorkerResponseMessage } from "./messages";

function createFakeWorker() {
  return {
    messages: [] as unknown[],
    terminateCalls: 0,
    onmessage: null as ((event: MessageEvent) => void) | null,
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

const columns: HierarchicalTableColumn[] = [
  { kind: "dataset", path: "obs/area" },
];

async function openClient() {
  const worker = createFakeWorker();
  const client = HierarchicalTableWorkerClient.open(
    worker as unknown as Worker,
    "table.h5ad",
  );
  worker.respond({ id: 0, columns, numRows: 3 });
  return { worker, client: await client };
}

describe("HierarchicalTableWorkerClient", () => {
  describe("open", () => {
    it("opens the source in the worker", async () => {
      const { worker, client } = await openClient();
      expect(worker.messages).toEqual([
        { op: "open", source: "table.h5ad", id: 0 },
      ]);
      expect(client.columns).toEqual(columns);
      expect(client.numRows).toBe(3);
    });

    it("terminates the worker when opening fails", async () => {
      const worker = createFakeWorker();
      const client = HierarchicalTableWorkerClient.open(
        worker as unknown as Worker,
        "table.h5ad",
      );
      worker.respond({ id: 0, error: "Not an HDF5 file" });
      await expect(client).rejects.toThrow("Not an HDF5 file");
      expect(worker.terminateCalls).toBe(1);
    });

    it("terminates the worker when the signal is already aborted", async () => {
      const worker = createFakeWorker();
      const reason = new Error("aborted");
      await expect(
        HierarchicalTableWorkerClient.open(
          worker as unknown as Worker,
          "table.h5ad",
          { signal: AbortSignal.abort(reason) },
        ),
      ).rejects.toBe(reason);
      expect(worker.messages).toEqual([]);
      expect(worker.terminateCalls).toBe(1);
    });
  });

  describe("readColumn", () => {
    it("requests the column with the row count and returns its data", async () => {
      const { worker, client } = await openClient();
      const data = client.readColumn("obs/area", { numRows: 3 });
      worker.respond({ id: 1, data: [1, 2, 3] });
      await expect(data).resolves.toEqual([1, 2, 3]);
      expect(worker.messages[1]).toEqual({
        op: "column",
        column: "obs/area",
        numRows: 3,
        id: 1,
      });
    });
  });

  describe("readRange", () => {
    it("requests the range with the row count and returns it", async () => {
      const { worker, client } = await openClient();
      const range = client.readRange("obs/area", { numRows: 3 });
      worker.respond({ id: 1, range: [1, 3] });
      await expect(range).resolves.toEqual([1, 3]);
      expect(worker.messages[1]).toEqual({
        op: "range",
        column: "obs/area",
        numRows: 3,
        id: 1,
      });
    });
  });

  describe("close", () => {
    it("terminates the worker", async () => {
      const { worker, client } = await openClient();
      client.close();
      expect(worker.terminateCalls).toBe(1);
    });
  });
});
