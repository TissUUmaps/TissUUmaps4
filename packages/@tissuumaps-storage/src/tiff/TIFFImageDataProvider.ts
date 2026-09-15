import type { GeoTIFFImage } from "geotiff";

import type {
  DataProviderLoadOptions,
  ImageDataProvider,
} from "@tissuumaps/core";

import { type TIFFChannel, TIFFImageData } from "./TIFFImageData";
import {
  type NormalizedTIFFImageDataSource,
  type TIFFImageDataSource,
  tiffImageDataSourceDefaults,
} from "./TIFFImageDataSource";
import { findTIFFParser } from "./formats/TIFFParser";
import { installTIFFTileSource } from "./installTIFFTileSource";
import { openTIFF } from "./openTIFF";
import { readChannelHistograms } from "./readChannelHistogram";

/**
 * Data provider for images stored in TIFF files
 *
 * Opens a {@link TIFFImageDataSource} as {@link TIFFImageData}, with one tile
 * source per channel for multi-channel files and a single one for files drawn
 * in their own colors. The format is recognized from the file's metadata (see
 * `findTIFFParser`), which provides the channel names and colors; the
 * histograms the renderer stretches the channels over are read from the
 * pixels.
 */
export class TIFFImageDataProvider implements ImageDataProvider<
  TIFFImageDataSource,
  TIFFImageData,
  NormalizedTIFFImageDataSource
> {
  readonly name = "TIFF";

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
   * Returns the data source with {@link tiffImageDataSourceDefaults} applied
   * and its URL resolved
   *
   * @param dataSource - The data source to normalize
   * @param projectUrl - The absolute URL of the project, or `null` for
   * projects that were not loaded from a URL
   * @returns The normalized data source
   */
  normalize(
    dataSource: TIFFImageDataSource,
    projectUrl: string | null,
  ): NormalizedTIFFImageDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, projectUrl ?? document.baseURI).href;
    }
    return { ...tiffImageDataSourceDefaults, ...dataSource, url };
  }

  /**
   * Opens a TIFF image data source and returns the loaded image data
   *
   * The file is opened with {@link openTIFF} and read by the parser of its
   * format, with the `z` and `t` of the data source selecting the plane. The
   * channel histograms are read afterwards, a few channels at a time (see
   * {@link readChannelHistograms}).
   *
   * @param normalizedDataSource - The normalized data source to open
   * @param options - See `DataProviderLoadOptions`; `workspace` is required
   * for data sources with a `path` but no `url`
   * @returns A promise that resolves to the loaded image data
   * @throws Error if the data source has neither a URL nor a workspace path,
   * has only a workspace path while no workspace is open, or holds a TIFF no
   * parser recognizes
   */
  async load(
    normalizedDataSource: NormalizedTIFFImageDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<TIFFImageData> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();

    const tiff = await openTIFF(normalizedDataSource, options);

    const { z, t } = normalizedDataSource;
    const parser = await findTIFFParser(tiff, { signal });
    const { pyramids, channels } = await parser.load(tiff, { z, t, signal });

    const { GeoTIFFTileSource, pool, poolSize } = installTIFFTileSource();
    let channelsWithHistograms: TIFFChannel[] | undefined;
    if (channels !== undefined) {
      // the histograms only seed the contrast limits, which the renderer can
      // fall back to the data type range for, so a file whose sample crops
      // cannot be decoded still opens
      let histograms: (
        { hist: number[]; range: [number, number] } | undefined
      )[] = [];
      try {
        histograms = await readChannelHistograms(pyramids, {
          pool,
          poolSize,
          signal,
        });
      } catch (error) {
        signal?.throwIfAborted();
        console.error("Failed to read the TIFF channel histograms:", error);
      }
      channelsWithHistograms = channels.map((channel, c) => ({
        ...channel,
        histogram: histograms[c],
        contrastLimits: getFullRange(pyramids[c]![0]!),
      }));
    }
    const tileSources = pyramids.map(
      (images) =>
        new GeoTIFFTileSource({ GeoTIFF: tiff, GeoTIFFImages: images }),
    );
    return new TIFFImageData(tileSources, channelsWithHistograms);
  }
}

/** The `SampleFormat` value of unsigned integer samples */
const sampleFormatUnsignedInteger = 1;

/**
 * Returns the contrast limits an 8-bit channel is shown over, `undefined` for
 * every other channel
 *
 * 8-bit channels are shown over their full range, like other viewers show
 * them, rather than over the quantile-based limits the renderer would
 * otherwise derive from their histogram. TIFF does not record the range; it is
 * the conventional display range of 8-bit samples.
 *
 * @param image - The largest level of the channel
 * @returns `[0, 255]` for an 8-bit unsigned integer channel, `undefined`
 * otherwise
 */
function getFullRange(image: GeoTIFFImage): [number, number] | undefined {
  if (
    image.getBitsPerSample(0) === 8 &&
    image.getSampleFormat(0) === sampleFormatUnsignedInteger
  ) {
    return [0, 255];
  }
  return undefined;
}
