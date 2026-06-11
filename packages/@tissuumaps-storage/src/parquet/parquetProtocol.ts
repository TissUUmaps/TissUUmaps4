/** The data source handed to the worker — a transferred buffer or a URL it fetches itself. */
export type ParquetSource =
  | { kind: "buffer"; buffer: ArrayBuffer }
  | {
      kind: "url";
      url: string;
      requestHeaders?: { [headerName: string]: string };
    };

/** Result of opening a Parquet source (metadata + eagerly decoded id/name columns). */
export type ParquetOpenResult = {
  numRows: number;
  columns: string[];
  ids?: number[];
  names?: string[];
};

/** Raw column data from the decoder: a typed array (transferred) or a plain array. */
export type ParquetColumnData = ArrayBufferView | unknown[];

/** Requests sent from the main thread to the worker. */
export type ParquetWorkerRequest =
  | {
      type: "open";
      id: number;
      source: ParquetSource;
      idColumn?: string;
      nameColumn?: string;
    }
  | { type: "loadColumn"; id: number; column: string };

/**
 * Responses sent from the worker to the main thread.
 *
 * `result` is `ParquetOpenResult` for an `open` request and `ParquetColumnData`
 * for a `loadColumn` request; the client knows which to expect from the request `id`.
 */
export type ParquetWorkerResponse =
  | {
      type: "result";
      id: number;
      result: ParquetOpenResult | ParquetColumnData;
    }
  | { type: "error"; id: number; message: string };
