import { getSlices } from "ome-zarr.js";
import { OMEZarrTileSource } from "omezarr-tilesource";
import * as zarr from "zarrita";

import {
  type DataProviderLoadOptions,
  type ImageDataProvider,
  MathUtils,
} from "@tissuumaps/core";

import { OMEZarrImageData } from "./OMEZarrImageData";
import {
  type NormalizedOMEZarrImageDataSource,
  type OMEZarrImageDataSource,
  omeZarrImageDataSourceDefaults,
} from "./OMEZarrImageDataSource";
import { openOMEZarr } from "./openOMEZarr";

/**
 * Data provider for OME-Zarr images
 *
 * Opens an {@link OMEZarrImageDataSource} as {@link OMEZarrImageData} with one
 * tile source and one precomputed value histogram per channel if the image has
 * a channel axis (even one of length one), and with a single tile source
 * otherwise.
 */
export class OMEZarrImageDataProvider implements ImageDataProvider<
  OMEZarrImageDataSource,
  OMEZarrImageData,
  NormalizedOMEZarrImageDataSource
> {
  /**
   * The minimum number of pixels of the resolution level that channel
   * histograms are computed from (see
   * {@link OMEZarrImageDataProvider._computeChannelHistogram}); more do not
   * make the quantiles the renderer derives from them more stable
   */
  private static readonly _histogramMinPixels = 512 * 512;

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
   * For images with a channel axis, the channels are opened concurrently, each
   * computing the value histogram of its plane from a downsampled resolution
   * level as soon as its tile source has opened (see
   * {@link OMEZarrImageDataProvider._computeChannelHistogram}), so that
   * {@link OMEZarrImageData.getChannelHistogram} can return it without
   * computing anything.
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
        const channelPromises = [];
        for (let c = 0; c < sizeC; c++) {
          const channelPromise = OMEZarrTileSource.open(
            { url, c, z, t, dataType: "ome-zarr" },
            image,
          ).then(async (tileSource) => {
            signal?.throwIfAborted();
            const histogram =
              await OMEZarrImageDataProvider._computeChannelHistogram(
                tileSource,
                { signal },
              );
            return { tileSource, histogram };
          });
          channelPromises.push(channelPromise);
        }
        const channels = await Promise.all(channelPromises);
        signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
        return new OMEZarrImageData(
          image,
          channels.map((channel) => channel.tileSource),
          channels.map((channel) => channel.histogram),
          objectUrl,
        );
      }
      const tileSource = await OMEZarrTileSource.open(
        { url, z, t, dataType: "ome-zarr" },
        image,
      );
      signal?.throwIfAborted(); // OMEZarrTileSource.open() does not throw on abort
      return new OMEZarrImageData(image, tileSource, undefined, objectUrl);
    } catch (error) {
      // the image data owns the object URL only once it has been created
      if (objectUrl !== undefined) {
        URL.revokeObjectURL(objectUrl);
      }
      throw error;
    }
  }

  /**
   * Computes the value histogram of a channel from a downsampled resolution level
   *
   * 64-bit integers get no histogram, and no values are read for them, as
   * their values cannot be represented without loss. For all other data types,
   * reads the plane that the given tile source displays (its channel, z-slice
   * and timepoint, the latter two defaulting to the image's `omero` defaults
   * like in the tile source itself) from the lowest resolution level that
   * still holds at least {@link OMEZarrImageDataProvider._histogramMinPixels}
   * pixels, or from the full-resolution level of images smaller than that, and
   * bins the plane's values over their actual range (see
   * {@link MathUtils.computeRange} and {@link MathUtils.computeHistogram}), so
   * that the histogram is as fine as its bins allow regardless of the data
   * type's range. Aborting the signal rejects with its reason.
   *
   * @param tileSource - The opened tile source of the channel
   * @param options - Optional abort signal
   * @returns A promise that resolves to the histogram, or to `undefined` for
   * 64-bit integer planes and planes with fewer than two distinct finite
   * values (which have no range to spread bins over; the renderer falls back
   * to the data type range for them)
   */
  private static async _computeChannelHistogram(
    tileSource: OMEZarrTileSource,
    options?: { signal?: AbortSignal },
  ): Promise<{ hist: number[]; range: [number, number] } | undefined> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();
    const { image, arrays, c, z, t } = tileSource;
    if (arrays[0]!.dtype === "int64" || arrays[0]!.dtype === "uint64") {
      return undefined;
    }
    const axisNames = image.getAxesNames();
    const xAxis = axisNames.indexOf("x");
    const yAxis = axisNames.indexOf("y");
    let level = arrays.length - 1;
    while (
      level > 0 &&
      arrays[level]!.shape[xAxis]! * arrays[level]!.shape[yAxis]! <
        OMEZarrImageDataProvider._histogramMinPixels
    ) {
      level--;
    }
    const array = arrays[level]!;
    const omero = image.checkChannelIndex(c ?? 0);
    const selection = getSlices([c ?? 0], array.shape, axisNames, {
      z: z ?? omero.rdefs?.defaultZ,
      t: t ?? omero.rdefs?.defaultT,
    })[0] as (number | zarr.Slice | null)[];
    const chunk = await zarr.get(array, selection, { signal });
    if (
      chunk.data instanceof BigInt64Array ||
      chunk.data instanceof BigUint64Array
    ) {
      return undefined; // not reached for the dtypes checked above; narrows the type
    }
    const [vmin, vmax] = await MathUtils.computeRange(chunk.data, { signal });
    if (vmin >= vmax) {
      return undefined; // no finite values, or a single one
    }
    return MathUtils.computeHistogram(chunk.data, [vmin, vmax], undefined, {
      signal,
    });
  }
}
