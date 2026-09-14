import { NgffImage } from "ome-zarr.js";
import { OMEZarrTileSource } from "omezarr-tilesource";

import type { LabelsDataProvider } from "@tissuumaps/core";

import { OMEZarrDataProvider } from "./OMEZarrDataProvider";
import { OMEZarrLabelsData } from "./OMEZarrLabelsData";
import {
  type NormalizedOMEZarrLabelsDataSource,
  type OMEZarrLabelsDataSource,
  omeZarrLabelsDataSourceDefaults,
} from "./OMEZarrLabelsDataSource";

/**
 * Data provider for OME-Zarr label images
 *
 * Opens an {@link OMEZarrLabelsDataSource} as {@link OMEZarrLabelsData} with a
 * single tile source; the image's channel axis, if any, is not iterated, and
 * `image-label` metadata is not read.
 */
export class OMEZarrLabelsDataProvider
  extends OMEZarrDataProvider<
    OMEZarrLabelsDataSource,
    OMEZarrLabelsData,
    NormalizedOMEZarrLabelsDataSource
  >
  implements
    LabelsDataProvider<
      OMEZarrLabelsDataSource,
      OMEZarrLabelsData,
      NormalizedOMEZarrLabelsDataSource
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
      table: {
        type: "string",
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
      {
        type: "Control",
        scope: "#/properties/table",
        label: "Table",
      },
    ],
  };

  /**
   * Returns the data source with {@link omeZarrLabelsDataSourceDefaults}
   * applied and its URL resolved
   *
   * @param dataSource - The data source to normalize
   * @param projectUrl - The absolute URL of the project, or `null` for projects
   * that were not loaded from a URL
   * @returns The normalized data source
   */
  normalize(
    dataSource: OMEZarrLabelsDataSource,
    projectUrl: string | null,
  ): NormalizedOMEZarrLabelsDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, projectUrl ?? document.baseURI).href;
    }
    return { ...omeZarrLabelsDataSourceDefaults, ...dataSource, url };
  }

  /**
   * Loads the OME-Zarr label image and opens its tile source
   *
   * @param url - The absolute URL to open the tile source with
   * @param store - The zarr store to load the OME-Zarr label image from
   * @param normalizedDataSource - The normalized data source being loaded,
   * whose `z` and `t` select the plane to open
   * @param objectUrl - The object URL created for a workspace file, if any
   * @param signal - The abort signal of the load operation, if any
   * @returns A promise that resolves to the loaded label image data
   */
  protected async open(
    url: string,
    store: Parameters<typeof NgffImage.load>[0],
    normalizedDataSource: NormalizedOMEZarrLabelsDataSource,
    objectUrl: string | undefined,
    signal: AbortSignal | undefined,
  ): Promise<OMEZarrLabelsData> {
    const image = await NgffImage.load(store, { signal });
    const { z, t } = normalizedDataSource;
    const tileSource = await OMEZarrTileSource.open(
      { url, z, t, dataType: "ome-zarr" },
      image,
    );
    signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
    return new OMEZarrLabelsData(tileSource, objectUrl);
  }
}
