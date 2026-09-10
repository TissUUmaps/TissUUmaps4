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
      throw new Error("Not a single-channel image");
    }
    if (c < 0 || c >= this._tileSources.length) {
      throw new Error(`Channel index ${c} is out of bounds`);
    }
    return this._tileSources[c]!;
  }

  /** The values are the cached raster's own band, not a copy; do not modify them */
  async getChannelData(
    _c: number,
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: TypedArray; width: number; height: number }> {
    if (this._channels === undefined) {
      throw new Error("Not a multi-channel image");
    }
    const raster = (await event.getData(tiffRasterType)) as TiffRaster;
    const band = raster.bands[0];
    if (band === undefined) {
      throw new Error("The tile raster has no bands");
    }
    return { values: band, width: raster.width, height: raster.height };
  }

  getChannelName(c: number): string | undefined {
    return this._channels?.[c]?.name;
  }

  getChannelColor(c: number): Color | undefined {
    return this._channels?.[c]?.color;
  }

  getChannelContrastLimits(c: number): [number, number] | undefined {
    return this._channels?.[c]?.contrastLimits;
  }

  close(): void {}
}
