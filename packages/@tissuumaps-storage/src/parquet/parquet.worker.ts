import {
  type AsyncBuffer,
  type FileMetaData,
  asyncBufferFromUrl,
  parquetMetadataAsync,
  parquetRead,
  parquetSchema,
} from "hyparquet";
import { compressors } from "hyparquet-compressors";

import type { GenericArray, TypedArray } from "@tissuumaps/core";

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
  columns: string[];
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

export type ParquetWorkerMessage =
  | ParquetWorkerResponse
  | { progress: number; total: number };

const ctx = self as unknown as {
  onmessage: ((event: MessageEvent<ParquetWorkerRequest>) => void) | null;
  postMessage: (
    message: ParquetWorkerMessage,
    transfer?: Transferable[],
  ) => void;
};

ctx.onmessage = (event) => {
  void (async () => {
    try {
      let result;
      switch (event.data.op) {
        case "file":
          result = await handleFileRequest(event.data, (progress, total) =>
            ctx.postMessage({ progress, total }),
          );
          break;
        case "column":
          result = await handleColumnRequest(event.data, (progress, total) =>
            ctx.postMessage({ progress, total }),
          );
          break;
        case "range":
          result = await handleRangeRequest(event.data, (progress, total) =>
            ctx.postMessage({ progress, total }),
          );
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

async function openParquet(source: ParquetSource): Promise<AsyncBuffer> {
  if (source.file !== undefined) {
    return {
      byteLength: source.file.size,
      slice: (start: number, end?: number) =>
        source.file!.slice(start, end).arrayBuffer(),
    };
  }
  if (source.url !== undefined) {
    return await asyncBufferFromUrl({
      url: source.url,
      requestInit: { headers: source.headers },
    });
  }
  throw new Error("A URL or file is required to load data.");
}

function getNumRows(metadata: FileMetaData): number {
  const numRows = Number(metadata.num_rows);
  if (!Number.isSafeInteger(numRows)) {
    throw new Error("Parquet file has too many rows");
  }
  return numRows;
}

function getColumns(metadata: FileMetaData): string[] {
  return parquetSchema(metadata).children.map(
    (columnElement) => columnElement.element.name,
  );
}

async function readParquetColumn(
  buffer: AsyncBuffer,
  metadata: FileMetaData,
  column: string,
  onProgress: (progress: number, total: number) => void,
): Promise<GenericArray<unknown>> {
  let bytesRead = 0;
  let result: GenericArray<unknown> | undefined;
  await parquetRead({
    file: {
      byteLength: buffer.byteLength,
      async slice(start, end) {
        const chunk = await buffer.slice(start, end);
        bytesRead += chunk.byteLength;
        onProgress(bytesRead, buffer.byteLength);
        return chunk;
      },
    },
    metadata,
    compressors,
    columns: [column],
    onChunk: ({ columnData, rowStart }) => {
      if (ArrayBuffer.isView(columnData)) {
        const chunk = columnData as TypedArray;
        if (result === undefined) {
          // @ts-expect-error typedArrayConstructor is a constructor
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call
          result = new chunk.constructor(getNumRows(metadata)) as TypedArray;
        }
        const out = result as TypedArray;
        out.set(chunk, rowStart);
      } else {
        const chunk = columnData as unknown[];
        if (result === undefined) {
          result = new Array(getNumRows(metadata)) as unknown[];
        }
        const out = result as unknown[];
        for (let i = 0; i < chunk.length; i++) {
          out[rowStart + i] = chunk[i];
        }
      }
    },
  });
  if (result === undefined) {
    throw new Error(`Column "${column}" not found in Parquet file`);
  }
  return result;
}

async function handleFileRequest(
  request: ParquetFileRequest,
  onProgress: (progress: number, total: number) => void,
): Promise<{
  response: ParquetFileResponse;
  transfer?: Transferable[];
}> {
  const buffer = await openParquet(request.source);
  const metadata = await parquetMetadataAsync(buffer);
  let idTotal = 0,
    nameTotal = 0,
    idProgress = 0,
    nameProgress = 0;
  const idDataPromise =
    request.idColumn !== undefined
      ? readParquetColumn(
          buffer,
          metadata,
          request.idColumn,
          (progress, total) => {
            idTotal = total;
            idProgress = progress;
            onProgress(idProgress + nameProgress, idTotal + nameTotal);
          },
        )
      : undefined;
  const nameDataPromise =
    request.nameColumn !== undefined
      ? readParquetColumn(
          buffer,
          metadata,
          request.nameColumn,
          (progress, total) => {
            nameTotal = total;
            nameProgress = progress;
            onProgress(idProgress + nameProgress, idTotal + nameTotal);
          },
        )
      : undefined;
  const [idData, nameData] = await Promise.all([
    idDataPromise,
    nameDataPromise,
  ]);
  const ids =
    idData !== undefined
      ? Array.from(idData, (id) => {
          if (id === undefined || id === "") {
            throw new Error(`Missing ID in column '${request.idColumn}'`);
          }
          const numericId = Number(id);
          if (!Number.isSafeInteger(numericId)) {
            throw new Error(`Invalid ID in column '${request.idColumn}'`);
          }
          return numericId;
        })
      : undefined;
  const names =
    nameData !== undefined ? Array.from(nameData, String) : undefined;
  return {
    response: {
      op: "file",
      numRows: getNumRows(metadata),
      columns: getColumns(metadata),
      ids,
      names,
    },
  };
}

async function handleColumnRequest(
  request: ParquetColumnRequest,
  onProgress: (progress: number, total: number) => void,
): Promise<{
  response: ParquetColumnResponse;
  transfer?: Transferable[];
}> {
  const buffer = await openParquet(request.source);
  const metadata = await parquetMetadataAsync(buffer);
  const columnMetadata = parquetSchema(metadata).children.find(
    (columnElement) => columnElement.element.name === request.column,
  );
  if (
    columnMetadata !== undefined &&
    columnMetadata.element.type === "INT64" &&
    (columnMetadata.element.logical_type !== undefined
      ? columnMetadata.element.logical_type.type === "INTEGER" &&
        columnMetadata.element.logical_type.bitWidth === 64
      : columnMetadata.element.converted_type === undefined ||
        columnMetadata.element.converted_type === "INT_64" ||
        columnMetadata.element.converted_type === "UINT_64")
  ) {
    throw new Error("64-bit integer columns are not supported");
  }
  const data = await readParquetColumn(
    buffer,
    metadata,
    request.column,
    onProgress,
  );
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

async function handleRangeRequest(
  request: ParquetRangeRequest,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _onProgress: (progress: number, total: number) => void,
): Promise<{
  response: ParquetRangeResponse;
  transfer?: Transferable[];
}> {
  const buffer = await openParquet(request.source);
  const metadata = await parquetMetadataAsync(buffer);
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
    if (typeof min_value !== "number" || typeof max_value !== "number") {
      return { response: { op: "range", range: undefined } };
    }
    if (min_value < vmin) {
      vmin = min_value;
    }
    if (max_value > vmax) {
      vmax = max_value;
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
