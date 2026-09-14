import { NgffImage } from "ome-zarr.js";
import { OMEZarrTileSource } from "omezarr-tilesource";

import type { ImageDataProvider } from "@tissuumaps/core";

import { OMEZarrDataProvider } from "./OMEZarrDataProvider";
import type { OMEZarrImageData } from "./OMEZarrImageData";
import {
  type NormalizedOMEZarrImageDataSource,
  type OMEZarrImageDataSource,
  omeZarrImageDataSourceDefaults,
} from "./OMEZarrImageDataSource";
import { OMEZarrMultiChannelImageData } from "./OMEZarrMultiChannelImageData";
import { OMEZarrSingleChannelImageData } from "./OMEZarrSingleChannelImageData";

/**
 * Data provider for OME-Zarr images
 *
 * Opens an {@link OMEZarrImageDataSource} as `OMEZarrMultiChannelImageData`
 * if the image has a channel axis with more than one channel, and as
 * `OMEZarrSingleChannelImageData` otherwise.
 */
export class OMEZarrImageDataProvider
  extends OMEZarrDataProvider<
    OMEZarrImageDataSource,
    OMEZarrImageData,
    NormalizedOMEZarrImageDataSource
  >
  implements
    ImageDataProvider<
      OMEZarrImageDataSource,
      OMEZarrImageData,
      NormalizedOMEZarrImageDataSource
    >
{
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
   * Loads the OME-Zarr image and opens one tile source per channel, or a
   * single tile source for images without a channel axis or with one channel
   *
   * All resolution levels are opened once up front, both to read the channel
   * count from the full-resolution array and so that the tile sources share
   * the opened arrays instead of reopening them concurrently.
   *
   * @param url - The absolute URL to open tile sources with
   * @param store - The zarr store to load the OME-Zarr image from
   * @param normalizedDataSource - The normalized data source being loaded,
   * whose `z` and `t` select the plane to open
   * @param objectUrl - The object URL created for a workspace file, if any
   * @param signal - The abort signal of the load operation, if any
   * @returns A promise that resolves to the loaded image data
   */
  protected async open(
    url: string,
    store: Parameters<typeof NgffImage.load>[0],
    normalizedDataSource: NormalizedOMEZarrImageDataSource,
    objectUrl: string | undefined,
    signal: AbortSignal | undefined,
  ): Promise<OMEZarrImageData> {
    const image = await NgffImage.load(store, { signal });
    const arrays = await Promise.all(
      image.paths.map((path) => image.openArray(path, { signal })),
    ); // pre-open all resolution levels once to avoid concurrent reopening
    const cIndex = image.getAxesNames().indexOf("c");
    const sizeC = cIndex >= 0 ? arrays[0]!.shape[cIndex]! : 1;
    const { z, t } = normalizedDataSource;
    if (sizeC > 1) {
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
  }
}
