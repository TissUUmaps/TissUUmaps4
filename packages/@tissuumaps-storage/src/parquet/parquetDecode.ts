import * as hyparquet from "hyparquet";
import { compressors } from "hyparquet-compressors";
import { parquetReadColumn } from "hyparquet/src/read.js";

import { type TypedArray } from "@tissuumaps/core";

import { type ParquetOpenResult, type ParquetSource } from "./parquetProtocol";

/**
 * Pure Parquet decoding, isolated from the worker message wiring so it can be
 * unit-tested on the main thread. `hyparquet` is imported only here (and thus,
 * transitively, only into the worker bundle) — it is never pulled into the main
 * application bundle.
 */
export type ParquetState = {
  file: hyparquet.AsyncBuffer | ArrayBuffer;
  metadata: hyparquet.FileMetaData;
};

/** Resolves the source, reads metadata, and eagerly decodes the id/name columns. */
export async function openParquetSource(
  source: ParquetSource,
  idColumn?: string,
  nameColumn?: string,
): Promise<{ state: ParquetState; result: ParquetOpenResult }> {
  const file =
    source.kind === "buffer"
      ? source.buffer
      : await hyparquet.asyncBufferFromUrl({
          url: source.url,
          requestInit: { headers: source.requestHeaders },
        });
  const metadata = await hyparquet.parquetMetadataAsync(file);
  const state: ParquetState = { file, metadata };
  const columns = hyparquet
    .parquetSchema(metadata)
    .children.map((c) => c.element.name);
  const numRows = Number(metadata.num_rows);

  let ids: number[] | undefined;
  if (idColumn !== undefined) {
    const raw = await readParquetColumn(state, idColumn);
    ids = Array.from(raw, (value) => {
      if (!Number.isInteger(value)) {
        throw new Error(`ID column "${idColumn}" contains non-integer values.`);
      }
      return Number(value);
    });
  }

  let names: string[] | undefined;
  if (nameColumn !== undefined) {
    const raw = await readParquetColumn(state, nameColumn);
    names = Array.from(raw, (value) => {
      if (value === undefined || value === null) {
        throw new Error(
          `Name column "${nameColumn}" contains undefined values.`,
        );
      }
      return String(value as string | number);
    });
  }

  return { state, result: { numRows, columns, ids, names } };
}

/** Decodes a single column, returning hyparquet's raw typed array / array. */
export async function readParquetColumn(
  state: ParquetState,
  column: string,
): Promise<unknown[] | TypedArray> {
  return (await parquetReadColumn({
    file: state.file,
    columns: [column],
    metadata: state.metadata,
    compressors: compressors,
  })) as unknown[] | TypedArray;
}
