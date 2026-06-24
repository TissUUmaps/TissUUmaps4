import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

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
  columnData: hyparquet.DecodedArray;
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
  const idColumnDataPromise =
    request.idColumn !== undefined
      ? parquetReadColumn({
          file: buffer,
          columns: [request.idColumn],
          metadata,
          compressors,
        })
      : undefined;
  const nameColumnDataPromise =
    request.nameColumn !== undefined
      ? parquetReadColumn({
          file: buffer,
          columns: [request.nameColumn],
          metadata,
          compressors,
        })
      : undefined;
  const [idColumnData, nameColumnData] = await Promise.all([
    idColumnDataPromise,
    nameColumnDataPromise,
  ]);
  const ids =
    idColumnData !== undefined
      ? Array.from(idColumnData, (id) => {
          const numericId = Number(id);
          if (id === "" || !Number.isInteger(numericId)) {
            throw new Error(`ID value "${id}" is not a valid integer.`);
          }
          return numericId;
        })
      : undefined;
  const names =
    nameColumnData !== undefined
      ? Array.from(nameColumnData, String)
      : undefined;
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
  return {
    response: { op: "column", columnData: data },
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
  let min: number | undefined;
  let max: number | undefined;
  for (const rowGroup of metadata.row_groups) {
    const columnChunk = rowGroup.columns.find(
      (column) => column.meta_data?.path_in_schema.join(".") === request.column,
    );
    if (columnChunk?.meta_data?.statistics !== undefined) {
      const { min_value, max_value } = columnChunk.meta_data.statistics;
      if (
        min_value !== undefined &&
        (typeof min_value === "number" || typeof min_value === "bigint") &&
        (min === undefined || min_value < min)
      ) {
        min = Number(min_value);
      }
      if (
        max_value !== undefined &&
        (typeof max_value === "number" || typeof max_value === "bigint") &&
        (max === undefined || max_value > max)
      ) {
        max = Number(max_value);
      }
    }
  }
  return {
    response: {
      op: "range",
      range: min !== undefined && max !== undefined ? [min, max] : undefined,
    },
  };
}
