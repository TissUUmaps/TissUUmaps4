import { OMEZarrTileSource } from "omezarr-tilesource";

import type {
  DataProviderLoadOptions,
  ImageDataProvider,
} from "@tissuumaps/core";

import type { OMEZarrImageData } from "./OMEZarrImageData";
import {
  type NormalizedOMEZarrImageDataSource,
  type OMEZarrImageDataSource,
  omeZarrImageDataSourceDefaults,
} from "./OMEZarrImageDataSource";
import { OMEZarrMultiChannelImageData } from "./OMEZarrMultiChannelImageData";
import { OMEZarrSingleChannelImageData } from "./OMEZarrSingleChannelImageData";
import { openOMEZarr } from "./openOMEZarr";

/**
 * Data provider for OME-Zarr images
 *
 * Opens an {@link OMEZarrImageDataSource} as `OMEZarrMultiChannelImageData`
 * if the image has a channel axis (even one of length one), and as
 * `OMEZarrSingleChannelImageData` otherwise.
 */
export class OMEZarrImageDataProvider implements ImageDataProvider<
  OMEZarrImageDataSource,
  OMEZarrImageData,
  NormalizedOMEZarrImageDataSource
> {
  readonly name = "OME-Zarr";

  readonly schema = {
    type: "object",
    properties: {
      url: {
        type: "string",
      },
      // TODO path
      z: {
        type: "integer",
      },
      t: {
        type: "integer",
      },
    },
    required: ["url"], // TODO ... or path
  };

  readonly uischema = {
    type: "VerticalLayout",
    elements: [
      {
        type: "Control",
        scope: "#/properties/url",
        label: "URL",
      },
      // TODO path
      {
        type: "Control",
        scope: "#/properties/z",
        label: "Z-slice",
      },
      {
        type: "Control",
        scope: "#/properties/t",
        label: "Timepoint",
      },
    ],
  };

  /**
   * Returns the data source with {@link omeZarrImageDataSourceDefaults} applied
   * and its URL resolved
   *
   * @param dataSource - The data source to normalize
   * @param projectUrl - The absolute URL of the project, or `null` for projects
   * that were not loaded from a URL
   * @returns The normalized data source
   */
  normalize(
    dataSource: OMEZarrImageDataSource,
    projectUrl: string | null,
  ): NormalizedOMEZarrImageDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, projectUrl ?? document.baseURI).href;
    }
    return { ...omeZarrImageDataSourceDefaults, ...dataSource, url };
  }

  /**
   * Opens an OME-Zarr image data source and returns the loaded image data
   *
   * The OME-Zarr image is loaded with {@link openOMEZarr} and one tile source
   * per channel is opened for images with a channel axis, or a single tile
   * source for images without one. All resolution levels are opened once up
   * front, both to read the channel count from the full-resolution array and
   * so that the tile sources share the opened arrays instead of reopening them
   * concurrently. The `z` and `t` of the data source select the plane to open.
   *
   * @param normalizedDataSource - The normalized data source to open
   * @param options - See `DataProviderLoadOptions`; `workspace` is required
   * for data sources with a `path` but no `url`
   * @returns A promise that resolves to the loaded image data
   * @throws Error if the data source has neither a URL nor a workspace path,
   * or has only a workspace path while no workspace is open
   */
  async load(
    normalizedDataSource: NormalizedOMEZarrImageDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<OMEZarrImageData> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { image, url, objectUrl } = await openOMEZarr(
      normalizedDataSource,
      options,
    );
    try {
      const arrays = await Promise.all(
        image.paths.map((path) => image.openArray(path, { signal })),
      ); // pre-open all resolution levels once to avoid concurrent reopening
      const cIndex = image.getAxesNames().indexOf("c");
      const { z, t } = normalizedDataSource;
      if (cIndex >= 0) {
        const sizeC = arrays[0]!.shape[cIndex]!;
        const tileSourcePromises: Promise<OMEZarrTileSource>[] = [];
        for (let c = 0; c < sizeC; c++) {
          const tileSourcePromise = OMEZarrTileSource.open(
            { url, c, z, t, dataType: "ome-zarr" },
            image,
          );
          tileSourcePromises.push(tileSourcePromise);
        }
        const tileSources = await Promise.all(tileSourcePromises);
        signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
        return new OMEZarrMultiChannelImageData(image, tileSources, objectUrl);
      }
      const tileSource = await OMEZarrTileSource.open(
        { url, z, t, dataType: "ome-zarr" },
        image,
      );
      signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
      return new OMEZarrSingleChannelImageData(tileSource, objectUrl);
    } catch (error) {
      // the image data owns the object URL only once it has been created
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
      throw error;
    }
  }
}
