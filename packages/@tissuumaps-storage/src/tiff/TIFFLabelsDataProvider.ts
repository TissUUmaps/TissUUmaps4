import type { GeoTIFFImage } from "geotiff";

import type {
  DataProviderLoadOptions,
  LabelsDataProvider,
} from "@tissuumaps/core";

import { TIFFLabelsData } from "./TIFFLabelsData";
import {
  type NormalizedTIFFLabelsDataSource,
  type TIFFLabelsDataSource,
  tiffLabelsDataSourceDefaults,
} from "./TIFFLabelsDataSource";
import { type TIFFStructure, findTIFFParser } from "./formats/TIFFParser";
import { installTIFFTileSource } from "./installTIFFTileSource";
import { openTIFF } from "./openTIFF";

/**
 * Data provider for label masks stored in TIFF files
 *
 * The file is read like any other TIFF (see `TIFFImageDataProvider`), but its
 * pixels are label IDs rather than intensities: it has to hold a single
 * channel of unsigned integers, which the renderer colors per ID instead of
 * contrast-stretching them.
 *
 * Which labels the mask holds is not recorded in the file, and is not read
 * from its pixels: the renderer resolves each label as it is first drawn.
 */
export class TIFFLabelsDataProvider implements LabelsDataProvider<
  TIFFLabelsDataSource,
  TIFFLabelsData,
  NormalizedTIFFLabelsDataSource
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
   * Returns the data source with {@link tiffLabelsDataSourceDefaults} applied
   * and its URL resolved
   *
   * @param dataSource - The data source to normalize
   * @param projectUrl - The absolute URL of the project, or `null` for
   * projects that were not loaded from a URL
   * @returns The normalized data source
   */
  normalize(
    dataSource: TIFFLabelsDataSource,
    projectUrl: string | null,
  ): NormalizedTIFFLabelsDataSource {
    let { url } = dataSource;
    if (url !== undefined) {
      url = new URL(url, projectUrl ?? document.baseURI).href;
    }
    return { ...tiffLabelsDataSourceDefaults, ...dataSource, url };
  }

  /**
   * Opens a TIFF labels data source and returns the loaded label mask
   *
   * The file is opened with {@link openTIFF} and read by the parser of its
   * format, with the `z` and `t` of the data source selecting the plane. The
   * pixels are not read: the renderer resolves the labels as it draws them.
   *
   * @param normalizedDataSource - The normalized data source to open
   * @param options - See `DataProviderLoadOptions`; `workspace` is required
   * for data sources with a `path` but no `url`
   * @returns A promise that resolves to the loaded label mask
   * @throws Error if the data source has neither a URL nor a workspace path,
   * has only a workspace path while no workspace is open, or holds a file that
   * is not a single channel of unsigned integers of at most 32 bits
   */
  async load(
    normalizedDataSource: NormalizedTIFFLabelsDataSource,
    options?: DataProviderLoadOptions,
  ): Promise<TIFFLabelsData> {
    const { signal } = options ?? {};
    signal?.throwIfAborted();

    const tiff = await openTIFF(normalizedDataSource, options);

    const parser = await findTIFFParser(tiff, { signal });
    const structure = await parser.load(tiff, {
      z: normalizedDataSource.z,
      t: normalizedDataSource.t,
      signal,
    });
    const levels = getLabelLevels(structure);

    const { GeoTIFFTileSource } = installTIFFTileSource();
    const tileSource = new GeoTIFFTileSource({
      GeoTIFF: tiff,
      GeoTIFFImages: levels,
    });
    return new TIFFLabelsData(tileSource);
  }
}

/**
 * Returns the pyramid levels of a structure that holds a label mask
 *
 * @param structure - The structure of the file
 * @returns The images of the mask, one per level, largest first
 * @throws Error if the file holds an RGB image, more than one channel, or
 * samples that are not unsigned integers of at most 32 bits, none of which can
 * be read as label IDs
 */
function getLabelLevels(structure: TIFFStructure): GeoTIFFImage[] {
  const { channels, pyramids } = structure;
  if (channels === undefined) {
    throw new Error(
      "The file holds an image drawn in its own colors, whose pixels are colors rather than label IDs.",
    );
  }
  if (channels.length !== 1) {
    throw new Error(
      `The file holds ${channels.length} channels; a label mask has a single one.`,
    );
  }
  const sampleFormatUnsignedInteger = 1;
  const levels = pyramids[0]!;
  const image = levels[0]!;
  const format = image.getSampleFormat(0);
  // BitsPerSample defaults to 1 (bilevel images) when the tag is absent
  const bits = image.getBitsPerSample(0) || 1;
  if (format !== sampleFormatUnsignedInteger || bits > 32) {
    throw new Error(
      "The image does not hold unsigned integers of at most 32 bits, which label IDs are.",
    );
  }
  return levels;
}
