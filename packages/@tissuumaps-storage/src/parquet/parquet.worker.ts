import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

export type ParquetRequest<TOp extends string> = {
  op: TOp;
};

export type ParquetResponse<TRequest extends ParquetRequest<string>> = {
  request: TRequest;
};

export type ParquetOpenRequest = ParquetRequest<"open"> & {
  file?: File;
  url?: string;
  headers?: { [header: string]: string };
  idColumn?: string;
  nameColumn?: string;
};

export type ParquetOpenResponse = ParquetResponse<ParquetOpenRequest> & {
  ids: number[] | undefined;
  names: string[] | undefined;
  numRows: number;
  columnNames: string[];
};

export type ParquetColumnRequest = ParquetRequest<"column"> & {
  file?: File;
  url?: string;
  headers?: { [header: string]: string };
  column: string;
};

export type ParquetColumnResponse = ParquetResponse<ParquetColumnRequest> & {
  values: ArrayLike<unknown>;
};

export type ParquetWorkerRequest = ParquetOpenRequest | ParquetColumnRequest;

export type ParquetWorkerResponse =
  | ParquetOpenResponse
  | ParquetColumnResponse
  | { error: string };

export type ParquetWorkerResponseFor<
  TWorkerRequest extends ParquetWorkerRequest,
> = Extract<ParquetWorkerResponse, { request: { op: TWorkerRequest["op"] } }>;

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
      switch (event.data.op) {
        case "open":
          await handleOpen(event.data);
          break;
        case "column":
          await handleColumn(event.data);
          break;
      }
    } catch (error) {
      ctx.postMessage({
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();
};

async function handleOpen(request: ParquetOpenRequest): Promise<void> {
  let file: hyparquet.AsyncBuffer | ArrayBuffer;
  if (request.file !== undefined) {
    file = await request.file.arrayBuffer();
  } else if (request.url !== undefined) {
    file = await hyparquet.asyncBufferFromUrl({
      url: request.url,
      requestInit: { headers: request.headers },
    });
  } else {
    throw new Error("A URL or file is required to load data.");
  }
  const metadata = await hyparquet.parquetMetadataAsync(file);
  let ids;
  if (request.idColumn !== undefined) {
    const rawIdColumnData = await parquetReadColumn({
      file,
      columns: [request.idColumn],
      metadata,
      compressors,
    });
    ids = Array.from(rawIdColumnData, (id) => {
      const numericId = +id;
      if (id === "" || !Number.isInteger(numericId)) {
        throw new Error(`ID value "${id}" is not a valid integer.`);
      }
      return numericId;
    });
  }
  let names;
  if (request.nameColumn !== undefined) {
    const rawNameColumnData = await parquetReadColumn({
      file,
      columns: [request.nameColumn],
      metadata,
      compressors,
    });
    names = Array.from(rawNameColumnData, String);
  }
  const columnNames = hyparquet
    .parquetSchema(metadata)
    .children.map((column) => column.element.name);
  ctx.postMessage({
    request,
    ids,
    names,
    numRows: Number(metadata.num_rows),
    columnNames,
  });
}

async function handleColumn(request: ParquetColumnRequest): Promise<void> {
  let file: hyparquet.AsyncBuffer | ArrayBuffer;
  if (request.file !== undefined) {
    file = await request.file.arrayBuffer();
  } else if (request.url !== undefined) {
    file = await hyparquet.asyncBufferFromUrl({
      url: request.url,
      requestInit: { headers: request.headers },
    });
  } else {
    throw new Error("A URL or file is required to load data.");
  }
  const metadata = await hyparquet.parquetMetadataAsync(file);
  const values = await parquetReadColumn({
    file,
    columns: [request.column],
    metadata,
    compressors,
  });
  const transfer = ArrayBuffer.isView(values)
    ? [values.buffer as ArrayBuffer]
    : undefined;
  ctx.postMessage({ request, values }, transfer);
}
