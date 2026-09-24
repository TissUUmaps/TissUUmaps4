import type { GenericArray } from "@tissuumaps/core";

import type {
  HierarchicalTable,
  HierarchicalTableColumn,
} from "../HierarchicalTable";
import { WorkerChannel } from "./WorkerChannel";
import type {
  HierarchicalTableColumnResponse,
  HierarchicalTableOpenResponse,
  HierarchicalTableRangeResponse,
} from "./messages";

/**
 * A {@link HierarchicalTable} served by a Web Worker running
 * {@link serveHierarchicalTable}
 *
 * The worker stays alive between requests: each start would reload the
 * container library and the store metadata.
 */
export class HierarchicalTableWorkerClient implements HierarchicalTable {
  readonly columns: HierarchicalTableColumn[];
  readonly numRows: number;
  private readonly _channel: WorkerChannel;

  private constructor(
    channel: WorkerChannel,
    columns: HierarchicalTableColumn[],
    numRows: number,
  ) {
    this._channel = channel;
    this.columns = columns;
    this.numRows = numRows;
  }

  /**
   * Opens a hierarchical table in a worker
   *
   * @param worker - A freshly started worker running
   * {@link serveHierarchicalTable}; terminated if opening fails
   * @param source - The file or URL to open
   * @param options - Optional abort signal
   * @returns The client, which owns the worker
   * @throws Error if the worker fails to open the source
   */
  static async open(
    worker: Worker,
    source: File | string,
    options?: { signal?: AbortSignal },
  ): Promise<HierarchicalTableWorkerClient> {
    const { signal } = options ?? {};
    const channel = new WorkerChannel(worker);
    try {
      signal?.throwIfAborted();
      const { columns, numRows } = (await channel.request(
        { op: "open", source },
        { signal },
      )) as HierarchicalTableOpenResponse;
      return new HierarchicalTableWorkerClient(channel, columns, numRows);
    } catch (error) {
      channel.terminate();
      throw error;
    }
  }

  async readColumn(
    query: string,
    options?: { numRows?: number; signal?: AbortSignal },
  ): Promise<GenericArray<unknown>> {
    const { numRows, signal } = options ?? {};
    signal?.throwIfAborted();
    const { data } = (await this._channel.request(
      { op: "column", column: query, numRows },
      { signal },
    )) as HierarchicalTableColumnResponse;
    return data;
  }

  async readRange(
    query: string,
    options?: { numRows?: number; signal?: AbortSignal },
  ): Promise<[number, number] | undefined> {
    const { numRows, signal } = options ?? {};
    signal?.throwIfAborted();
    const { range } = (await this._channel.request(
      { op: "range", column: query, numRows },
      { signal },
    )) as HierarchicalTableRangeResponse;
    return range;
  }

  /** Terminates the worker, rejecting all pending requests */
  close(): void {
    this._channel.terminate();
  }
}
