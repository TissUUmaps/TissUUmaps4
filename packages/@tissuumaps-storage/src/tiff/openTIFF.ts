import {
  type BlockedSourceOptions,
  type GeoTIFF,
  type RemoteSourceOptions,
  fromBlob,
  fromUrl,
} from "geotiff";

import type { DataProviderLoadOptions } from "@tissuumaps/core";

/**
 * Remote files are read in 64 KiB blocks, of which 256 (16 MiB) are cached per
 * open file. Without blocks, geotiff.js sends one range request per tag value
 * and per strip.
 */
const remoteSourceOptions: RemoteSourceOptions & BlockedSourceOptions = {
  blockSize: 65536,
  cacheSize: 256,
};

/**
 * Opens the TIFF file a data source points to
 *
 * Files in the open workspace are read through their file handle, remote files
 * over HTTP range requests (see {@link remoteSourceOptions}). A data source
 * that has both is read from the workspace, and falls back to its URL when no
 * workspace is open.
 *
 * Opening a file reads nothing but its header; its directories and pixels are
 * read on demand.
 *
 * @param normalizedDataSource - The `url` and/or workspace `path` of the
 * normalized data source to open
 * @param options - See `DataProviderLoadOptions`; `workspace` is required for
 * data sources with a `path` but no `url`
 * @returns The opened file
 * @throws Error if the data source has neither a URL nor a path, or has only a
 * path while no workspace is open
 */
export async function openTIFF(
  normalizedDataSource: { url?: string; path?: string },
  options?: DataProviderLoadOptions,
): Promise<GeoTIFF> {
  const { signal, workspace = null } = options ?? {};
  signal?.throwIfAborted();
  if (normalizedDataSource.path !== undefined && workspace !== null) {
    const fh = await workspace.getFileHandle(normalizedDataSource.path);
    signal?.throwIfAborted(); // getFileHandle() does not throw on abort
    const file = await fh.getFile();
    signal?.throwIfAborted(); // getFile() does not throw on abort
    return await fromBlob(file, signal);
  }
  if (normalizedDataSource.url !== undefined) {
    return await fromUrl(normalizedDataSource.url, remoteSourceOptions, signal);
  }
  if (normalizedDataSource.path !== undefined) {
    throw new Error("An open workspace is required to open local-only data.");
  }
  throw new Error("A URL or workspace path is required to load data.");
}
