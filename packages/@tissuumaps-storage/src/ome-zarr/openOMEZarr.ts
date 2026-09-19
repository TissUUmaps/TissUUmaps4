import { type OMEZarr, OMEZarrTileSource } from "omezarr-tilesource";

import { SourceUtils } from "@tissuumaps/core";

/**
 * Resolves the source of an OME-Zarr data source and loads the OME-Zarr image
 * and the arrays of all its resolution levels from it with
 * `OMEZarrTileSource.loadOMEZarr`
 *
 * The normalized source is resolved with `SourceUtils.resolveSource`: a
 * workspace file (which has to be a zipped OME-Zarr file) is read through the
 * open workspace, a URL ending in `.ozx` is opened as a remote zipped OME-Zarr
 * file, and any other URL as a remote OME-Zarr store.
 *
 * For workspace files, an object URL is created for the file: the tile sources
 * load nothing from it (the loaded image is shared), but need an absolute URL
 * that is unique to the file for their tile cache keys. The caller owns the
 * object URL and has to revoke it when done with the image; it is revoked here
 * only if loading the image fails.
 *
 * @param normalizedSource - The normalized source of the data source to open
 * @param options - `signal` aborts the load, `workspace` is the directory
 * handle of the open workspace and is required for workspace-relative sources
 * @returns A promise that resolves to the loaded image and arrays (to share
 * between the tile sources opened for it, see `OMEZarrTileSource.open`), the
 * absolute URL and the `zip` flag to open the tile sources with (`true` for
 * workspace files, whose object URL does not carry the `.ozx` suffix that the
 * tile source classifies URLs by, and `undefined` for URLs, which it
 * classifies itself, just like `OMEZarrTileSource.loadOMEZarr` does here), and
 * the object URL created for a workspace file, if any (in which case `url` is
 * that object URL)
 * @throws Error if the source is workspace-relative while no workspace is open
 */
export async function openOMEZarr(
  normalizedSource: string,
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
  const resolvedSource = await SourceUtils.resolveSource(
    normalizedSource,
    workspace,
    { signal },
  );
  if (typeof resolvedSource === "string") {
    const loaded = await OMEZarrTileSource.loadOMEZarr(
      resolvedSource,
      undefined,
      { signal },
    );
    return {
      loaded,
      url: resolvedSource,
      zip: undefined,
      objectUrl: undefined,
    };
  }
  const file = await resolvedSource.getFile();
  signal?.throwIfAborted(); // getFile() does not throw on abort
  const objectUrl = URL.createObjectURL(file);
  try {
    // a workspace file is a single file, i.e. a zipped OME-Zarr
    const loaded = await OMEZarrTileSource.loadOMEZarr(file, true, { signal });
    return { loaded, url: objectUrl, zip: true, objectUrl };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}
