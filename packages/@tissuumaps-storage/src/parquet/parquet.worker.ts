import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

export type ParquetRequest<TOp extends string = string> = {
  op: TOp;
};

export type ParquetResponse<TRequest extends ParquetRequest> = {
  op: TRequest["op"];
};

export type ParquetOpenRequest = ParquetRequest<"open"> & {
  file?: File;
  url?: string;
  headers?: { [header: string]: string };
};

export type ParquetOpenResponse = ParquetResponse<ParquetOpenRequest> & {
  numRows: number;
  columnNames: string[];
};

export type ParquetReadColumnRequest = ParquetRequest<"readColumn"> & {
  column: string;
};

export type ParquetReadColumnResponse =
  ParquetResponse<ParquetReadColumnRequest> & {
    data: hyparquet.DecodedArray;
  };

export type ParquetWorkerRequest =
  | ParquetOpenRequest
  | ParquetReadColumnRequest;

export type ParquetWorkerResponse =
  | ParquetOpenResponse
  | ParquetReadColumnResponse
  | { error: string };

export type ParquetWorkerResponseFor<
  TWorkerRequest extends ParquetWorkerRequest,
> = Extract<ParquetWorkerResponse, { op: TWorkerRequest["op"] }>;

export type ParquetWorkerRequestMessage = { id: number } & ParquetWorkerRequest;

export type ParquetWorkerResponseMessage = {
  id: number;
} & ParquetWorkerResponse;

const ctx = self as unknown as {
  onmessage:
    | ((event: MessageEvent<ParquetWorkerRequestMessage>) => void)
    | null;
  postMessage: (
    message: ParquetWorkerResponseMessage,
    transfer?: Transferable[],
  ) => void;
};

ctx.onmessage = (event) => {
  const { id } = event.data;
  void (async () => {
    try {
      let result;
      switch (event.data.op) {
        case "open":
          result = await handleOpen(event.data);
          break;
        case "readColumn":
          result = await handleReadColumn(event.data);
          break;
        default:
          throw new Error("Unknown request");
      }
      const { response, transfer } = result;
      ctx.postMessage({ id, ...response }, transfer);
    } catch (error) {
      ctx.postMessage({
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
};

type ParquetHandle = {
  buffer: hyparquet.AsyncBuffer | ArrayBuffer;
  metadata: Awaited<ReturnType<typeof hyparquet.parquetMetadataAsync>>;
};

let parquetHandlePromise: Promise<ParquetHandle> | undefined;

async function openParquet(
  request: ParquetOpenRequest,
): Promise<ParquetHandle> {
  let buffer;
  if (request.file !== undefined) {
    buffer = await request.file.arrayBuffer();
  } else if (request.url !== undefined) {
    buffer = await hyparquet.asyncBufferFromUrl({
      url: request.url,
      requestInit: { headers: request.headers },
    });
  } else {
    throw new Error("A URL or file is required to load data.");
  }
  const metadata = await hyparquet.parquetMetadataAsync(buffer);
  return { buffer, metadata };
}

async function handleOpen(request: ParquetOpenRequest): Promise<{
  response: ParquetOpenResponse;
  transfer?: Transferable[];
}> {
  if (parquetHandlePromise !== undefined) {
    throw new Error("Worker has already been opened");
  }
  parquetHandlePromise = openParquet(request);
  try {
    const { metadata } = await parquetHandlePromise;
    const numRows = Number(metadata.num_rows);
    const columnNames = hyparquet
      .parquetSchema(metadata)
      .children.map((column) => column.element.name);
    return { response: { op: "open", numRows, columnNames } };
  } catch (error) {
    parquetHandlePromise = undefined;
    throw error;
  }
}

async function handleReadColumn(request: ParquetReadColumnRequest): Promise<{
  response: ParquetReadColumnResponse;
  transfer?: Transferable[];
}> {
  if (parquetHandlePromise === undefined) {
    throw new Error("Worker has not been opened yet");
  }
  const { buffer, metadata } = await parquetHandlePromise;
  const data = await parquetReadColumn({
    file: buffer,
    columns: [request.column],
    metadata,
    compressors,
  });
  return {
    response: { op: "readColumn", data },
    transfer:
      ArrayBuffer.isView(data) && data.buffer instanceof ArrayBuffer
        ? [data.buffer]
        : undefined,
  };
}
