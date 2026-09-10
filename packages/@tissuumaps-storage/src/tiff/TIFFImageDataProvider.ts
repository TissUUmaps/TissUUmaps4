import {
  type BlockedSourceOptions,
  type GeoTIFF,
  type RemoteSourceOptions,
  fromBlob,
  fromUrl,
} from "geotiff";

import type {
  DataProviderOpenOptions,
  ImageDataProvider,
} from "@tissuumaps/core";

import { TIFFImageData } from "./TIFFImageData";
import {
  type NormalizedTIFFImageDataSource,
  type TIFFImageDataSource,
  tiffImageDataSourceDefaults,
} from "./TIFFImageDataSource";
import { estimateContrastLimits } from "./estimateContrastLimits";
import { type TIFFChannel, findTIFFParser } from "./formats/TIFFParser";
import { installTIFFTileSource } from "./installTIFFTileSource";

/**
 * Remote files are read in 64 KiB blocks, of which 256 (16 MiB) are cached per
 * open file. Without blocks, geotiff.js sends one range request per tag value
 * and per strip.
 */
const remoteSourceOptions: RemoteSourceOptions & BlockedSourceOptions = {
  blockSize: 65536,
  cacheSize: 256,
};

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
    options?: DataProviderOpenOptions,
  ): Promise<TIFFImageData> {
    const { signal, workspace = null } = options ?? {};
    signal?.throwIfAborted();

    let tiff: GeoTIFF;
    if (normalizedDataSource.path !== undefined && workspace !== null) {
      const fh = await workspace.getFileHandle(normalizedDataSource.path);
      signal?.throwIfAborted(); // getFileHandle() does not throw on abort
      const file = await fh.getFile();
      signal?.throwIfAborted(); // getFile() does not throw on abort
      tiff = await fromBlob(file, signal);
    } else if (normalizedDataSource.url !== undefined) {
      tiff = await fromUrl(
        normalizedDataSource.url,
        remoteSourceOptions,
        signal,
      );
    } else if (normalizedDataSource.path !== undefined) {
      throw new Error("An open workspace is required to open local-only data.");
    } else {
      throw new Error("A URL or workspace path is required to load data.");
    }

    const { z, t } = normalizedDataSource;
    const parser = await findTIFFParser(tiff, { signal });
    const { pyramids, channels } = await parser.load(tiff, { z, t, signal });

    const { GeoTIFFTileSource, pool, poolSize } = installTIFFTileSource();
    let channelsWithLimits: TIFFChannel[] | undefined;
    if (channels !== undefined) {
      // one estimate per decoder worker at a time, so that a file with many
      // channels does not start every read at once
      const limits: [number, number][] = [];
      let next = 0;
      await Promise.all(
        Array.from(
          { length: Math.min(poolSize, channels.length) },
          async () => {
            for (let c = next++; c < channels.length; c = next++) {
              limits[c] = await estimateContrastLimits(pyramids[c]!, {
                pool,
                signal,
              });
            }
          },
        ),
      );
      channelsWithLimits = channels.map((channel, c) => ({
        ...channel,
        contrastLimits: limits[c]!,
      }));
    }
    const tileSources = pyramids.map(
      (images) =>
        new GeoTIFFTileSource({ GeoTIFF: tiff, GeoTIFFImages: images }),
    );
    return new TIFFImageData(tileSources, channelsWithLimits);
  }
}
