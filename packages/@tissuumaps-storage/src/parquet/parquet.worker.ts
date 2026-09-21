import type { Geometry } from "geojson";
import {
  type AsyncBuffer,
  type FileMetaData,
  asyncBufferFromUrl,
  parquetMetadataAsync,
  parquetRead,
  parquetSchema,
} from "hyparquet";
import { compressors } from "hyparquet-compressors";

import {
  type GenericArray,
  type ShapesGeometry,
  ShapesGeometryBuilder,
  type TypedArray,
} from "@tissuumaps/core";

import { ParquetMetadataUtils } from "./ParquetMetadataUtils";
import type { ParquetSource } from "./types";

/**
 * Appends a GeoJSON geometry, as decoded from a WKB column, as one shape
 *
 * @param builder - The builder of the shapes geometry under construction
 * @param geometry - The geometry to add
 * @param id - The ID of the shape
 * @param name - The name of the shape, if any
 */
function addGeometry(
  builder: ShapesGeometryBuilder,
  geometry: Geometry,
  id: number,
  name?: string,
): void {
  if (geometry.type === "Polygon") {
    builder.addShape([geometry.coordinates], id, name);
    return;
  }
  if (geometry.type === "MultiPolygon") {
    builder.addShape(geometry.coordinates, id, name);
    return;
  }
  console.warn(`Unsupported geometry type: ${geometry.type}`);
}

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

export type ParquetCoordinatesRequest = ParquetRequest<"coordinates"> & {
  source: ParquetSource;
  geometryColumn: string;
};

export type ParquetCoordinatesResponse =
  ParquetResponse<ParquetCoordinatesRequest> & {
    x: Float32Array;
    y: Float32Array;
  };

export type ParquetShapesRequest = ParquetRequest<"shapes"> & {
  source: ParquetSource;
  geometryColumn: string | undefined;
  idColumn: string | undefined;
  nameColumn: string | undefined;
};

export type ParquetShapesResponse = ParquetResponse<ParquetShapesRequest> & {
  geometry: ShapesGeometry;
  ids: number[];
  names: string[] | undefined;
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
  | ParquetCoordinatesRequest
  | ParquetShapesRequest
  | ParquetRangeRequest;

export type ParquetWorkerResponse =
  | ParquetFileResponse
  | ParquetColumnResponse
  | ParquetCoordinatesResponse
  | ParquetShapesResponse
  | ParquetRangeResponse
  | { error: string };

export type ParquetWorkerResponseFor<
  TWorkerRequest extends ParquetWorkerRequest,
> = Extract<ParquetWorkerResponse, { op: TWorkerRequest["op"] }>;

export type ParquetWorkerMessage =
  ParquetWorkerResponse | { progress: number; total: number };

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
        case "coordinates":
          result = await handleCoordinatesRequest(
            event.data,
            (progress, total) => ctx.postMessage({ progress, total }),
          );
          break;
        case "shapes":
          result = await handleShapesRequest(event.data, (progress, total) =>
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

function openParquet(source: ParquetSource): Promise<AsyncBuffer> {
  if (source.file !== undefined) {
    return Promise.resolve({
      byteLength: source.file.size,
      slice: (start: number, end?: number) =>
        source.file!.slice(start, end).arrayBuffer(),
    });
  }
  if (source.url !== undefined) {
    return asyncBufferFromUrl({
      url: source.url,
      requestInit: { headers: source.headers },
    });
  }
  return Promise.reject(new Error("A URL or file is required to load data."));
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
    (columnMetadata) => columnMetadata.element.name,
  );
}

function readColumnChunks(
  buffer: AsyncBuffer,
  metadata: FileMetaData,
  column: string,
  onChunk: (columnData: unknown, rowStart: number) => void,
  onProgress: (progress: number, total: number) => void,
): Promise<void> {
  let bytesRead = 0;
  return parquetRead({
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
    onChunk: ({ columnData, rowStart }) => onChunk(columnData, rowStart),
  });
}

async function readParquetColumn(
  buffer: AsyncBuffer,
  metadata: FileMetaData,
  column: string,
  onProgress: (progress: number, total: number) => void,
): Promise<GenericArray<unknown>> {
  let result: GenericArray<unknown> | undefined;
  await readColumnChunks(
    buffer,
    metadata,
    column,
    (columnData, rowStart) => {
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
    onProgress,
  );
  if (result === undefined) {
    throw new Error(`Column "${column}" not found in Parquet file`);
  }
  return result;
}

function readGeometryColumn(
  buffer: AsyncBuffer,
  metadata: FileMetaData,
  column: string,
  onGeometry: (geometry: Geometry | null, row: number) => void,
  onProgress: (progress: number, total: number) => void,
): Promise<void> {
  return readColumnChunks(
    buffer,
    metadata,
    column,
    (columnData, rowStart) => {
      // WKB columns are decoded to GeoJSON geometries by the Parquet reader
      const geometries = columnData as (Geometry | null | undefined)[];
      for (let i = 0; i < geometries.length; i++) {
        onGeometry(geometries[i] ?? null, rowStart + i);
      }
    },
    onProgress,
  );
}

async function readIdsAndNames(
  buffer: AsyncBuffer,
  metadata: FileMetaData,
  idColumn: string | undefined,
  nameColumn: string | undefined,
  onProgress: (progress: number, total: number) => void,
): Promise<{ ids: number[] | undefined; names: string[] | undefined }> {
  let idTotal = 0,
    nameTotal = 0,
    idProgress = 0,
    nameProgress = 0;
  const idDataPromise =
    idColumn !== undefined
      ? readParquetColumn(buffer, metadata, idColumn, (progress, total) => {
          idTotal = total;
          idProgress = progress;
          onProgress(idProgress + nameProgress, idTotal + nameTotal);
        })
      : undefined;
  const nameDataPromise =
    nameColumn !== undefined
      ? readParquetColumn(buffer, metadata, nameColumn, (progress, total) => {
          nameTotal = total;
          nameProgress = progress;
          onProgress(idProgress + nameProgress, idTotal + nameTotal);
        })
      : undefined;
  const [idData, nameData] = await Promise.all([
    idDataPromise,
    nameDataPromise,
  ]);
  const ids =
    idData !== undefined
      ? Array.from(idData, (id) => {
          if (id === undefined || id === "") {
            throw new Error(`Missing ID in column '${idColumn}'`);
          }
          const numericId = Number(id);
          if (!Number.isSafeInteger(numericId)) {
            throw new Error(`Invalid ID in column '${idColumn}'`);
          }
          return numericId;
        })
      : undefined;
  const names =
    nameData !== undefined ? Array.from(nameData, String) : undefined;
  return { ids, names };
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
  const { ids, names } = await readIdsAndNames(
    buffer,
    metadata,
    request.idColumn ?? ParquetMetadataUtils.readIndexColumn(metadata),
    request.nameColumn,
    onProgress,
  );
  const geoColumns = ParquetMetadataUtils.readGeoColumns(metadata);
  return {
    response: {
      op: "file",
      numRows: getNumRows(metadata),
      columns: [
        ...getColumns(metadata).filter(
          (column) => !geoColumns.some(({ name }) => name === column),
        ),
        ...ParquetMetadataUtils.getCoordinateColumns(geoColumns),
      ],
      ids,
      names,
    },
  };
}

/**
 * Reads both coordinate axes of a point geometry column in one pass
 *
 * The WKB column is decoded once for both axes, so that a point cloud reading
 * its x and y from the same column does not decode it twice.
 *
 * @param buffer - The file to read from
 * @param metadata - The file metadata
 * @param column - The point geometry column to read
 * @param onProgress - Callback reporting the read progress
 * @returns The x and y coordinates of every row
 * @throws Error if a row holds no geometry, or one that is not a point
 */
async function readCoordinateColumns(
  buffer: AsyncBuffer,
  metadata: FileMetaData,
  column: string,
  onProgress: (progress: number, total: number) => void,
): Promise<{ x: Float32Array; y: Float32Array }> {
  const numRows = getNumRows(metadata);
  const x = new Float32Array(numRows);
  const y = new Float32Array(numRows);
  await readGeometryColumn(
    buffer,
    metadata,
    column,
    (geometry, row) => {
      if (geometry === null) {
        throw new Error(`Missing geometry in column "${column}"`);
      }
      if (geometry.type !== "Point") {
        throw new Error(
          `Column "${column}" contains a ${geometry.type} geometry`,
        );
      }
      x[row] = geometry.coordinates[0]!;
      y[row] = geometry.coordinates[1]!;
    },
    onProgress,
  );
  return { x, y };
}

async function handleCoordinatesRequest(
  request: ParquetCoordinatesRequest,
  onProgress: (progress: number, total: number) => void,
): Promise<{
  response: ParquetCoordinatesResponse;
  transfer?: Transferable[];
}> {
  const buffer = await openParquet(request.source);
  const metadata = await parquetMetadataAsync(buffer);
  const { x, y } = await readCoordinateColumns(
    buffer,
    metadata,
    request.geometryColumn,
    onProgress,
  );
  return {
    response: { op: "coordinates", x, y },
    transfer: [x.buffer, y.buffer],
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
    (columnMetadata) => columnMetadata.element.name === request.column,
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

async function handleShapesRequest(
  request: ParquetShapesRequest,
  onProgress: (progress: number, total: number) => void,
): Promise<{
  response: ParquetShapesResponse;
  transfer?: Transferable[];
}> {
  const buffer = await openParquet(request.source);
  const metadata = await parquetMetadataAsync(buffer);
  const geoColumns = ParquetMetadataUtils.readGeoColumns(metadata);
  const geoColumn =
    request.geometryColumn !== undefined
      ? geoColumns.find(({ name }) => name === request.geometryColumn)
      : ParquetMetadataUtils.getPrimaryColumn(geoColumns);
  if (geoColumn === undefined) {
    throw new Error(
      request.geometryColumn !== undefined
        ? `Geometry column "${request.geometryColumn}" not found in Parquet file`
        : "Parquet file has no GeoParquet geometry column",
    );
  }
  if (ParquetMetadataUtils.isPointColumn(geoColumn)) {
    throw new Error(
      `Geometry column "${geoColumn.name}" holds points, which are read as ` +
        `the "${geoColumn.name}[x]" and "${geoColumn.name}[y]" columns of a ` +
        `table`,
    );
  }
  // Progress only tracks the geometry, which dwarfs the ID and name columns
  const { ids: rowIds, names: rowNames } = await readIdsAndNames(
    buffer,
    metadata,
    request.idColumn ?? ParquetMetadataUtils.readIndexColumn(metadata),
    request.nameColumn,
    () => {},
  );
  const builder = new ShapesGeometryBuilder();
  await readGeometryColumn(
    buffer,
    metadata,
    geoColumn.name,
    (rowGeometry, row) => {
      if (rowGeometry === null) {
        console.warn("Skipping row without geometry.");
        return;
      }
      addGeometry(
        builder,
        rowGeometry,
        rowIds !== undefined ? rowIds[row]! : row,
        rowNames?.[row],
      );
    },
    onProgress,
  );
  if (builder.size === 0) {
    throw new Error(`No valid geometries found in column "${geoColumn.name}"`);
  }
  const { geometry, ids, names } = builder.build();
  return {
    response: {
      op: "shapes",
      geometry,
      ids,
      names,
    },
    transfer: [
      geometry.shapePolygonOffsets.buffer,
      geometry.polygonRingOffsets.buffer,
      geometry.ringVertexOffsets.buffer,
      geometry.coords.buffer,
    ],
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
  const coordinates = ParquetMetadataUtils.resolveCoordinateColumn(
    ParquetMetadataUtils.readGeoColumns(metadata),
    request.column,
  );
  if (coordinates !== undefined) {
    const { bbox } = coordinates.geoColumn;
    return {
      response: {
        op: "range",
        range:
          bbox !== undefined
            ? coordinates.axis === "x"
              ? [bbox[0], bbox[2]]
              : [bbox[1], bbox[3]]
            : undefined,
      },
    };
  }
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
