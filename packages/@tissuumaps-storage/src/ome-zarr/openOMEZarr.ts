import { type OMEZarr, OMEZarrTileSource } from "omezarr-tilesource";

/**
 * Resolves an OME-Zarr data source and loads the OME-Zarr image and the arrays
 * of all its resolution levels from it with `OMEZarrTileSource.loadOMEZarr`
 *
 * A workspace `path` (which has to refer to a zipped OME-Zarr file) is read
 * through the open workspace, a `url` ending in `.ozx` is opened as a remote
 * zipped OME-Zarr file, and any other `url` as a remote OME-Zarr store. A
 * workspace path takes precedence over a URL when a workspace is open.
 *
 * For workspace files, an object URL is created for the file: the tile sources
 * load nothing from it (the loaded image is shared), but need an absolute URL
 * that is unique to the file for their tile cache keys. The caller owns the
 * object URL and has to revoke it when done with the image; it is revoked here
 * only if loading the image fails.
 *
 * @param url - The URL of the data source to open, if any
 * @param path - The workspace path of the data source to open, if any
 * @param options - `signal` aborts the load, `workspace` is the directory
 * handle of the open workspace and is required for data sources with a `path`
 * but no `url`
 * @returns A promise that resolves to the loaded image and arrays (to share
 * between the tile sources opened for it, see `OMEZarrTileSource.open`), the
 * absolute URL and the `zip` flag to open the tile sources with (`true` for
 * workspace files, whose object URL does not carry the `.ozx` suffix that the
 * tile source classifies URLs by, and `undefined` for URLs, which it
 * classifies itself, just like `OMEZarrTileSource.loadOMEZarr` does here), and
 * the object URL created for a workspace file, if any (in which case `url` is
 * that object URL)
 * @throws Error if the data source has neither a URL nor a workspace path, or
 * has only a workspace path while no workspace is open
 */
export async function openOMEZarr(
  url: string | undefined,
  path: string | undefined,
  options?: {
    signal?: AbortSignal;
    workspace?: FileSystemDirectoryHandle | null;
  },
): Promise<{
  loaded: OMEZarr;
  url: string;
  zip: boolean | undefined;
  objectUrl: string | undefined;
}> {
  const { signal, workspace = null } = options ?? {};
  signal?.throwIfAborted();
  if (path !== undefined && workspace !== null) {
    const fh = await workspace.getFileHandle(path);
    signal?.throwIfAborted(); // getFileHandle() does not throw on abort
    const file = await fh.getFile();
    signal?.throwIfAborted(); // getFile() does not throw on abort
    const objectUrl = URL.createObjectURL(file);
    try {
      // a workspace path refers to a single file, i.e. a zipped OME-Zarr
      const loaded = await OMEZarrTileSource.loadOMEZarr(file, true, {
        signal,
      });
      return { loaded, url: objectUrl, zip: true, objectUrl };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw error;
    }
  }
  if (url !== undefined) {
    const loaded = await OMEZarrTileSource.loadOMEZarr(url, undefined, {
      signal,
    });
    return { loaded, url, zip: undefined, objectUrl: undefined };
  }
  if (path !== undefined) {
    throw new Error("An open workspace is required to open local-only data.");
  }
  throw new Error("A URL or workspace path is required to load data.");
}
