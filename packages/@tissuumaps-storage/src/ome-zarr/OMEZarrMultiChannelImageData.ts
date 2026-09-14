import type { NgffImage } from "ome-zarr.js";
import type { OMEZarrTileSource } from "omezarr-tilesource";

import {
  type Color,
  ColorUtils,
  type CustomTileSource,
  type TileSourceConfig,
} from "@tissuumaps/core";

import { OMEZarrImageData } from "./OMEZarrImageData";

/**
 * Loaded OME-Zarr image data with more than one channel
 *
 * Provides one tile source per channel, addressed by channel index, and the
 * per-channel rendering metadata (name, visibility, color, contrast limits)
 * from the image's `omero` metadata.
 */
export class OMEZarrMultiChannelImageData extends OMEZarrImageData {
  private readonly _image: NgffImage;
  private readonly _tileSources: OMEZarrTileSource[];

  constructor(
    image: NgffImage,
    tileSources: OMEZarrTileSource[],
    objectUrl?: string,
  ) {
    super(objectUrl);
    this._image = image;
    this._tileSources = tileSources;
  }

  getSizeC(): number {
    return this._tileSources.length;
  }

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    if (c === undefined) {
      throw new Error("Not a single-channel image");
    }
    const tileSource = this._tileSources[c];
    if (tileSource === undefined) {
      throw new Error(`Channel index ${c} is out of bounds`);
    }
    return tileSource;
  }

  getChannelName(c: number): string | undefined {
    const { label } = this._image.checkChannelIndex(c).channels[c]!;
    return typeof label === "string" ? label : undefined;
  }

  getChannelVisibility(c: number): boolean | undefined {
    return this._image.checkChannelIndex(c).channels[c]!.active;
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
}
