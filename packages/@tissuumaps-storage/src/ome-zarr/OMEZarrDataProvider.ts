import ZipFileStore from "@zarrita/storage/zip";
import type { NgffImage } from "ome-zarr.js";

import type { DataProvider, DataProviderLoadOptions } from "@tissuumaps/core";

import type { OMEZarrData } from "./OMEZarrData";
import type { OMEZarrDataSource } from "./OMEZarrDataSource";

/**
 * Base class for data providers opening OME-Zarr data
 *
 * Resolves the {@link OMEZarrDataSource} to a zarr store and manages the object
 * URL of data loaded from a workspace file; subclasses load the OME-Zarr image
 * from the store and open the tile sources they need in
 * {@link OMEZarrDataProvider.open}.
 *
 * @typeParam TDataSource - The data source type this data provider opens
 * @typeParam TData - The {@link OMEZarrData} type produced by this data provider
 * @typeParam TNormalizedDataSource - The data source type produced by
 * `normalize` and accepted by `load`
 */
export abstract class OMEZarrDataProvider<
  TDataSource extends OMEZarrDataSource,
  TData extends OMEZarrData,
  TNormalizedDataSource extends TDataSource = TDataSource,
> implements DataProvider<TDataSource, TData, TNormalizedDataSource> {
  readonly name = "OME-Zarr";

  abstract readonly schema: DataProvider<
    TDataSource,
    TData,
    TNormalizedDataSource
  >["schema"];

  abstract readonly uischema: DataProvider<
    TDataSource,
    TData,
    TNormalizedDataSource
  >["uischema"];

  abstract normalize(
    dataSource: TDataSource,
    projectUrl: string | null,
  ): TNormalizedDataSource;

  async load(
    normalizedDataSource: TNormalizedDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<TData> {
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
      // the tile sources load nothing from the URL (the image is shared), but
      // need an absolute URL that is unique to the file for their tile cache keys
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
      return await this.open(
        url,
        store,
        normalizedDataSource,
        objectUrl,
        signal,
      );
    } catch (error) {
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
      throw error;
    }
  }

  /**
   * Loads the OME-Zarr image from a zarr store, opens the tile sources it needs
   * and wraps them in data
   *
   * Called by {@link OMEZarrDataProvider.load}, which revokes `objectUrl` if
   * this rejects; the returned data owns `objectUrl` afterwards and revokes it
   * on close.
   *
   * @param url - The absolute URL to open tile sources with (see
   * `OMEZarrTileSource.open`), which is `objectUrl` for workspace files
   * @param store - The zarr store to load the OME-Zarr image from (see
   * `NgffImage.load`)
   * @param normalizedDataSource - The normalized data source being loaded
   * @param objectUrl - The object URL created for a workspace file, if any
   * @param signal - The abort signal of the load operation, if any
   * @returns A promise that resolves to the loaded data
   */
  protected abstract open(
    url: string,
    store: Parameters<typeof NgffImage.load>[0],
    normalizedDataSource: TNormalizedDataSource,
    objectUrl: string | undefined,
    signal: AbortSignal | undefined,
  ): Promise<TData>;
}
