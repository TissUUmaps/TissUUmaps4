import type { TiffRaster } from "geotiff-tilesource";
import type OpenSeadragon from "openseadragon";

import type {
  Color,
  CustomTileSource,
  ImageData,
  TileSourceConfig,
  TypedArray,
} from "@tissuumaps/core";

import type { TIFFChannel } from "./formats/TIFFParser";
import { tiffRasterType } from "./installTIFFTileSource";

/**
 * The loaded image of a TIFF file
 *
 * Multi-channel files provide one tile source per channel, whose tiles carry
 * the raw samples that the renderer contrast-stretches and colorizes, using the
 * channel names and colors read from the file and the value histogram read from
 * its pixels. Files that are drawn in their own colors (RGB, palette or
 * white-is-zero) provide a single tile source instead.
 *
 * Channel visibility is not provided: neither OME-XML nor the QPTIFF
 * description records it.
 */
export class TIFFImageData implements ImageData {
  private readonly _tileSources: OpenSeadragon.TileSource[];
  private readonly _channels: TIFFChannel[] | undefined;

  /**
   * @param tileSources - One per channel, or a single one for RGB images
   * @param channels - The channels, or `undefined` for RGB images
   */
  constructor(
    tileSources: OpenSeadragon.TileSource[],
    channels: TIFFChannel[] | undefined,
  ) {
    this._tileSources = tileSources;
    this._channels = channels;
  }

  getSizeC(): number | undefined {
    return this._channels?.length;
  }

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    if (this._channels === undefined) {
      if (c !== undefined) {
        throw new Error("Not a multi-channel image");
      }
      return this._tileSources[0]!;
    }
    if (c === undefined) {
      throw new Error("A channel index is required for multi-channel images");
    }
    if (c < 0 || c >= this._tileSources.length) {
      throw new Error(`Channel index ${c} is out of bounds`);
    }
    return this._tileSources[c]!;
  }

  /**
   * Extracts the samples of a channel tile from a tile invalidation event
   *
   * The samples are returned as they are, in the raster's own size (see
   * {@link TiffRaster}), not cropped to the tile's bounds. They are the cached
   * raster's own band rather than a copy (see `copyRasters` in
   * `installTIFFTileSource`), so callers must not modify them.
   *
   * @param event - The tile invalidation event
   * @returns The samples of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster
   * @throws Error if the file is drawn in its own colors, or if the tile's
   * raster has no band
   */
  async getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: TypedArray; width: number; height: number }> {
    if (this._channels === undefined) {
      throw new Error("Not a multi-channel image");
    }
    const raster = (await event.getData(tiffRasterType)) as TiffRaster;
    const band = raster.bands[0];
    if (band === undefined) {
      throw new Error("The tile's raster has no bands");
    }
    return { values: band, width: raster.width, height: raster.height };
  }

  getChannelName(c: number): string | undefined {
    return this._channels?.[c]?.name;
  }

  getChannelColor(c: number): Color | undefined {
    return this._channels?.[c]?.color;
  }

  getChannelHistogram(
    c: number,
  ): { hist: number[]; range: [number, number] } | undefined {
    return this._channels?.[c]?.histogram;
  }

  getChannelContrastLimits(c: number): [number, number] | undefined {
    return this._channels?.[c]?.contrastLimits;
  }

  close(): void {
    // the decoder pool is shared, and the file is read on demand
  }
}
