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
 * Loaded OME-Zarr image data with a channel axis
 *
 * Provides one tile source per channel, addressed by channel index, and the
 * per-channel rendering metadata (name, visibility, color, contrast limits)
 * from the image's `omero` metadata.
 */
export class OMEZarrMultiChannelImageData extends OMEZarrImageData {
  private readonly _image: NgffImage;
  private readonly _tileSources: OMEZarrTileSource[];

  /**
   * @param image - The loaded OME-Zarr image, whose `omero` metadata provides
   * the per-channel rendering metadata
   * @param tileSources - One tile source per channel, in channel order, each
   * opened with `dataType: "ome-zarr"` and the channel selected
   * @param objectUrl - The object URL created for the workspace file the
   * image was loaded from, if any (see {@link OMEZarrImageData})
   */
  constructor(
    image: NgffImage,
    tileSources: OMEZarrTileSource[],
    objectUrl?: string,
  ) {
    super(objectUrl);
    this._image = image;
    this._tileSources = tileSources;
  }

  /** Returns the number of channels in the image */
  getSizeC(): number {
    return this._tileSources.length;
  }

  /**
   * Returns the tile source of a channel
   *
   * @param c - The channel index (0-based)
   * @returns The channel's tile source
   * @throws Error if `c` is omitted or out of bounds
   */
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

  /**
   * Returns the label of a channel from the image's `omero` metadata
   *
   * @param c - The channel index (0-based)
   * @returns The channel's label, or `undefined` if it has none
   * @throws Error if `c` is out of bounds
   */
  getChannelName(c: number): string | undefined {
    const { label } = this._image.checkChannelIndex(c).channels[c]!;
    return typeof label === "string" ? label : undefined;
  }

  /**
   * Returns whether a channel is active in the image's `omero` metadata
   *
   * @param c - The channel index (0-based)
   * @returns The channel's active flag, or `undefined` if it has none
   * @throws Error if `c` is out of bounds
   */
  getChannelVisibility(c: number): boolean | undefined {
    return this._image.checkChannelIndex(c).channels[c]!.active;
  }

  /**
   * Returns the color of a channel from the image's `omero` metadata
   *
   * Channel colors are 6-digit hex strings with an optional `#`. Channels
   * without a valid color are white if any channel of the image has a color,
   * so that the channels of an image are colored consistently, and have no
   * color otherwise (leaving the renderer to derive one from the index).
   *
   * @param c - The channel index (0-based)
   * @returns The channel's color, or `undefined` if no channel has one
   * @throws Error if `c` is out of bounds
   */
  getChannelColor(c: number): Color | undefined {
    const { channels } = this._image.checkChannelIndex(c);
    const match = /^#?([0-9A-Fa-f]{6})$/.exec(channels[c]!.color);
    if (match !== null) {
      return ColorUtils.fromHex(`#${match[1]}`);
    }
    const hasColors = channels.some((channel) => channel.color !== undefined);
    return hasColors ? { r: 255, g: 255, b: 255 } : undefined;
  }

  /**
   * Returns the rendering window of a channel from the image's `omero` metadata
   *
   * @param c - The channel index (0-based)
   * @returns The channel's window `[start, end]` widened to a non-empty range
   * if necessary, or `undefined` if the window has no start or no end
   * @throws Error if `c` is out of bounds
   */
  getChannelContrastLimits(c: number): [number, number] | undefined {
    const { start, end } = this._image.checkChannelIndex(c).channels[c]!.window;
    if (start !== undefined && end !== undefined) {
      return start < end ? [start, end] : [start, start + 1];
    }
    return undefined;
  }
}
