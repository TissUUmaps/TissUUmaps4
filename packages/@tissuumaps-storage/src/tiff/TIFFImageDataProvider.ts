import type {
  DataProviderLoadOptions,
  ImageDataProvider,
} from "@tissuumaps/core";

import { TIFFImageData } from "./TIFFImageData";
import {
  type NormalizedTIFFImageDataSource,
  type TIFFImageDataSource,
  tiffImageDataSourceDefaults,
} from "./TIFFImageDataSource";
import { type TIFFChannel, findTIFFParser } from "./formats/TIFFParser";
import { installTIFFTileSource } from "./installTIFFTileSource";
import { openTIFF } from "./openTIFF";
import { readChannelHistogram } from "./readChannelHistogram";

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
      // one histogram per decoder worker at a time, so that a file with many
      // channels does not start every read at once
      const histograms: (
        { hist: number[]; range: [number, number] } | undefined
      )[] = [];
      let next = 0;
      await Promise.all(
        Array.from(
          { length: Math.min(poolSize, channels.length) },
          async () => {
            for (let c = next++; c < channels.length; c = next++) {
              histograms[c] = await readChannelHistogram(pyramids[c]!, {
                pool,
                signal,
              });
            }
          },
        ),
      );
      channelsWithHistograms = channels.map((channel, c) => ({
        ...channel,
        histogram: histograms[c],
      }));
    }
    const tileSources = pyramids.map(
      (images) =>
        new GeoTIFFTileSource({ GeoTIFF: tiff, GeoTIFFImages: images }),
    );
    return new TIFFImageData(tileSources, channelsWithHistograms);
  }
}
