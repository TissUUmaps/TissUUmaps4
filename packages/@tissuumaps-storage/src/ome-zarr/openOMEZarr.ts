import ZipFileStore from "@zarrita/storage/zip";
import { NgffImage } from "ome-zarr.js";

import type { DataProviderLoadOptions } from "@tissuumaps/core";

/**
 * Resolves an OME-Zarr data source to a zarr store and loads the OME-Zarr
 * image from it
 *
 * A workspace `path` (which has to refer to a zipped OME-Zarr file) is read
 * through the open workspace, a `url` ending in `.ozx` is opened as a remote
 * zipped OME-Zarr file, and any other `url` as a remote OME-Zarr store. A
 * workspace path takes precedence over a URL when a workspace is open.
 *
 * For workspace files, an object URL is created for the file: the tile sources
 * load nothing from it (the image is shared), but need an absolute URL that is
 * unique to the file for their tile cache keys. The caller owns the object URL
 * and has to revoke it when done with the image; it is revoked here only if
 * loading the image fails.
 *
 * @param normalizedDataSource - The `url` and/or workspace `path` of the
 * normalized data source to open
 * @param options - See `DataProviderLoadOptions`; `workspace` is required for
 * data sources with a `path` but no `url`
 * @returns A promise that resolves to the loaded image, the absolute URL to
 * open tile sources with (see `OMEZarrTileSource.open`), and the object URL
 * created for a workspace file, if any (in which case `url` is that object URL)
 * @throws Error if the data source has neither a URL nor a workspace path, or
 * has only a workspace path while no workspace is open
 */
export async function openOMEZarr(
  normalizedDataSource: { url?: string; path?: string },
  options?: DataProviderLoadOptions,
): Promise<{ image: NgffImage; url: string; objectUrl: string | undefined }> {
  const { signal, workspace = null } = options ?? {};
  signal?.throwIfAborted();
  let url: string;
  let store: Parameters<typeof NgffImage.load>[0];
  let objectUrl: string | undefined = undefined;
  if (normalizedDataSource.path !== undefined && workspace !== null) {
    const fh = await workspace.getFileHandle(normalizedDataSource.path);
    signal?.throwIfAborted(); // getFileHandle() does not throw on abort
    const file = await fh.getFile();
    signal?.throwIfAborted(); // getFile() does not throw on abort
    // a workspace path refers to a single file, i.e. a zipped OME-Zarr
    store = ZipFileStore.fromBlob(file);
    objectUrl = URL.createObjectURL(file);
    url = objectUrl;
  } else if (normalizedDataSource.url !== undefined) {
    url = normalizedDataSource.url;
    store = new URL(url).pathname.endsWith(".ozx")
      ? ZipFileStore.fromUrl(url)
      : url;
  } else if (normalizedDataSource.path !== undefined) {
    throw new Error("An open workspace is required to open local-only data.");
  } else {
    throw new Error("A URL or workspace path is required to load data.");
  }
  try {
    const image = await NgffImage.load(store, { signal });
    return { image, url, objectUrl };
  } catch (error) {
    if (objectUrl !== undefined) {
      URL.revokeObjectURL(objectUrl);
    }
    throw error;
  }
}
