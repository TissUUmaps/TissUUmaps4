import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import { type GenericArray, ParseUtils } from "@tissuumaps/core";

import type { ParquetSource } from "./types";

export type ParquetRequest<TOp extends string = string> = {
  op: TOp;
};

export type ParquetResponse<TRequest extends ParquetRequest> = {
  op: TRequest["op"];
};

export type ParquetFileRequest = ParquetRequest<"file"> & {
  source: ParquetSource;
  idColumn: string | undefined;
  nameColumn: string | undefined;
};

export type ParquetFileResponse = ParquetResponse<ParquetFileRequest> & {
  numRows: number;
  columnNames: string[];
  ids: number[] | undefined;
  names: string[] | undefined;
};

export type ParquetColumnRequest = ParquetRequest<"column"> & {
  source: ParquetSource;
  column: string;
};

export type ParquetColumnResponse = ParquetResponse<ParquetColumnRequest> & {
  data: GenericArray<unknown>;
};

export type ParquetRangeRequest = ParquetRequest<"range"> & {
  source: ParquetSource;
  column: string;
};

export type ParquetRangeResponse = ParquetResponse<ParquetRangeRequest> & {
  range: [number, number] | undefined;
};

export type ParquetWorkerRequest =
  | ParquetFileRequest
  | ParquetColumnRequest
  | ParquetRangeRequest;

export type ParquetWorkerResponse =
  | ParquetFileResponse
  | ParquetColumnResponse
  | ParquetRangeResponse
  | { error: string };

export type ParquetWorkerResponseFor<
  TWorkerRequest extends ParquetWorkerRequest,
> = Extract<ParquetWorkerResponse, { op: TWorkerRequest["op"] }>;

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ParquetWorkerRequest>) => void) | null;
  postMessage: (
    message: ParquetWorkerResponse,
    transfer?: Transferable[],
  ) => void;
};

ctx.onmessage = (event) => {
  void (async () => {
    try {
      let result;
      switch (event.data.op) {
        case "file":
          result = await handleFileRequest(event.data);
          break;
        case "column":
          result = await handleColumnRequest(event.data);
          break;
        case "range":
          result = await handleRangeRequest(event.data);
          break;
        default:
          throw new Error("Unknown request");
      }
      ctx.postMessage(result.response, result.transfer);
    } catch (error) {
      ctx.postMessage({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
};

async function openParquet(
  source: ParquetSource,
): Promise<hyparquet.AsyncBuffer> {
  if (source.file !== undefined) {
    return {
      byteLength: source.file.size,
      slice: (start: number, end?: number) =>
        source.file!.slice(start, end).arrayBuffer(),
    };
  }
  if (source.url !== undefined) {
    return await hyparquet.asyncBufferFromUrl({
      url: source.url,
      requestInit: { headers: source.headers },
    });
  }
  throw new Error("A URL or file is required to load data.");
}

async function handleFileRequest(request: ParquetFileRequest): Promise<{
  response: ParquetFileResponse;
  transfer?: Transferable[];
}> {
  const buffer = await openParquet(request.source);
  const metadata = await hyparquet.parquetMetadataAsync(buffer);
  const numRows = Number(metadata.num_rows);
  const columnNames = hyparquet
    .parquetSchema(metadata)
    .children.map((column) => column.element.name);
  const idDataPromise =
    request.idColumn !== undefined
      ? parquetReadColumn({
          file: buffer,
          columns: [request.idColumn],
          metadata,
          compressors,
        })
      : undefined;
  const nameDataPromise =
    request.nameColumn !== undefined
      ? parquetReadColumn({
          file: buffer,
          columns: [request.nameColumn],
          metadata,
          compressors,
        })
      : undefined;
  const [idData, nameData] = await Promise.all([
    idDataPromise,
    nameDataPromise,
  ]);
  const ids =
    idData !== undefined
      ? Array.from(idData, (id) => ParseUtils.parseSafeInt(id))
      : undefined;
  const names =
    nameData !== undefined ? Array.from(nameData, String) : undefined;
  return {
    response: {
      op: "file",
      numRows,
      columnNames,
      ids,
      names,
    },
  };
}

async function handleColumnRequest(request: ParquetColumnRequest): Promise<{
  response: ParquetColumnResponse;
  transfer?: Transferable[];
}> {
  const buffer = await openParquet(request.source);
  const metadata = await hyparquet.parquetMetadataAsync(buffer);
  const data = await parquetReadColumn({
    file: buffer,
    columns: [request.column],
    metadata,
    compressors,
  });
  if (data instanceof BigInt64Array || data instanceof BigUint64Array) {
    throw new Error("64-bit integer columns are not supported");
  }
  return {
    response: { op: "column", data },
    transfer:
      ArrayBuffer.isView(data) && data.buffer instanceof ArrayBuffer
        ? [data.buffer]
        : undefined,
  };
}

async function handleRangeRequest(request: ParquetRangeRequest): Promise<{
  response: ParquetRangeResponse;
  transfer?: Transferable[];
}> {
  const buffer = await openParquet(request.source);
  const metadata = await hyparquet.parquetMetadataAsync(buffer);
  let vmin = Infinity;
  let vmax = -Infinity;
  for (const rowGroup of metadata.row_groups) {
    const columnChunk = rowGroup.columns.find(
      (column) => column.meta_data?.path_in_schema.join(".") === request.column,
    );
    if (columnChunk === undefined) {
      throw new Error(`Column "${request.column}" not found in Parquet file`);
    }
    if (columnChunk.meta_data?.statistics === undefined) {
      return { response: { op: "range", range: undefined } };
    }
    const { min_value, max_value } = columnChunk.meta_data.statistics;
    const chunkMin = ParseUtils.tryParseFinite(min_value);
    const chunkMax = ParseUtils.tryParseFinite(max_value);
    if (chunkMin === undefined || chunkMax === undefined) {
      return { response: { op: "range", range: undefined } };
    }
    if (chunkMin < vmin) {
      vmin = chunkMin;
    }
    if (chunkMax > vmax) {
      vmax = chunkMax;
    }
  }
  return {
    response: {
      op: "range",
      range:
        Number.isFinite(vmin) && Number.isFinite(vmax)
          ? [vmin, vmax]
          : undefined,
    },
  };
}
