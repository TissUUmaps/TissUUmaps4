import { OMEZarrTileSource } from "omezarr-tilesource";

import type {
  DataProviderLoadOptions,
  LabelsDataProvider,
} from "@tissuumaps/core";

import { OMEZarrLabelsData } from "./OMEZarrLabelsData";
import {
  type NormalizedOMEZarrLabelsDataSource,
  type OMEZarrLabelsDataSource,
  omeZarrLabelsDataSourceDefaults,
} from "./OMEZarrLabelsDataSource";
import { openOMEZarr } from "./openOMEZarr";

/**
 * Data provider for OME-Zarr label images
 *
 * Opens an {@link OMEZarrLabelsDataSource} as {@link OMEZarrLabelsData} with a
 * single tile source rendering the first channel; the image's channel axis, if
 * any, is not iterated, and `image-label` metadata is not read.
 */
export class OMEZarrLabelsDataProvider implements LabelsDataProvider<
  OMEZarrLabelsDataSource,
  OMEZarrLabelsData,
  NormalizedOMEZarrLabelsDataSource
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
        minimum: 0,
      },
      t: {
        type: "integer",
        minimum: 0,
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
        type: "HorizontalLayout",
        elements: [
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
   * Opens an OME-Zarr labels data source and returns the loaded label image
   * data
   *
   * The OME-Zarr label image and its arrays are loaded with
   * {@link openOMEZarr} and a tile source rendering its first channel is
   * opened for them, with the `z` and `t` of the data source selecting the
   * plane to open.
   *
   * @param normalizedDataSource - The normalized data source to open
   * @param options - See `DataProviderLoadOptions`; `workspace` is required
   * for data sources with a `path` but no `url`
   * @returns A promise that resolves to the loaded label image data
   * @throws Error if the data source has neither a URL nor a workspace path,
   * or has only a workspace path while no workspace is open
   */
  async load(
    normalizedDataSource: NormalizedOMEZarrLabelsDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<OMEZarrLabelsData> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { loaded, url, zip, objectUrl } = await openOMEZarr(
      normalizedDataSource.url,
      normalizedDataSource.path,
      options,
    );
    try {
      const { t, z } = normalizedDataSource;
      const tileSource = await OMEZarrTileSource.open(
        { url, zip, t, z, c: 0 },
        loaded,
        { signal },
      );
      return new OMEZarrLabelsData(tileSource, objectUrl);
    } catch (error) {
      // the label image data owns the object URL only once it has been created
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
      throw error;
    }
  }
}
