import type { NgffImage } from "ome-zarr.js";
import type { OMEZarrTileData, OMEZarrTileSource } from "omezarr-tilesource";
import type OpenSeadragon from "openseadragon";

import {
  type Color,
  ColorUtils,
  type CustomTileSource,
  type ImageData,
  type NumericArray,
  type TileSourceConfig,
} from "@tissuumaps/core";

export class OMEZarrImageData implements ImageData {
  private readonly _image: NgffImage;
  private readonly _tileSource: OMEZarrTileSource | undefined;
  private readonly _tileSources: OMEZarrTileSource[] | undefined;
  private readonly _objectUrl?: string;

  constructor(
    image: NgffImage,
    tileSource: OMEZarrTileSource | undefined,
    tileSources: OMEZarrTileSource[] | undefined,
    objectUrl?: string,
  ) {
    this._image = image;
    this._tileSource = tileSource;
    this._tileSources = tileSources;
    this._objectUrl = objectUrl;
  }

  getSizeC(): number | undefined {
    return this._tileSources?.length;
  }

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    if (c !== undefined) {
      if (this._tileSources === undefined) {
        throw new Error("Not a multi-channel image");
      }
      const tileSource = this._tileSources[c];
      if (tileSource === undefined) {
        throw new Error(`Channel index ${c} is out of bounds`);
      }
      return tileSource;
    }
    if (this._tileSource === undefined) {
      throw new Error("Not a single-channel image");
    }
    return this._tileSource;
  }

  async getChannelData(
    _c: number,
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: NumericArray; width: number; height: number }> {
    const { chunk } = (await event.getData("ome-zarr")) as OMEZarrTileData;
    const [height, width] = chunk.shape as [number, number];
    const values =
      chunk.data instanceof BigInt64Array ||
      chunk.data instanceof BigUint64Array
        ? Float64Array.from(chunk.data, Number)
        : chunk.data;
    return { values, width, height };
  }

  getChannelName(c: number): string | undefined {
    const { label } = this._image.checkChannelIndex(c).channels[c]!;
    return typeof label === "string" ? label : undefined;
  }

  getChannelVisibility(c: number): boolean | undefined {
    return this._image.checkChannelIndex(c).channels[c]!.active;
  }

  getChannelOpacity(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _c: number,
  ): number | undefined {
    return undefined; // omero metadata has no channel opacity
  }

  getChannelColor(c: number): Color | undefined {
    const { channels } = this._image.checkChannelIndex(c);
    const match = /^#?([0-9A-Fa-f]{6})$/.exec(channels[c]!.color);
    if (match !== null) {
      return ColorUtils.fromHex(`#${match[1]}`);
    }
    const hasColors = channels.some((channel) => channel.color !== undefined);
    return hasColors ? { r: 255, g: 255, b: 255 } : undefined;
  }

  getChannelContrastLimits(c: number): [number, number] | undefined {
    const { start, end } = this._image.checkChannelIndex(c).channels[c]!.window;
    if (start !== undefined && end !== undefined) {
      return start < end ? [start, end] : [start, start + 1];
    }
    return undefined;
  }

  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
