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

/**
 * Loaded OME-Zarr image data
 *
 * Images with a channel axis are multi-channel: they provide one tile source
 * per channel, addressed by channel index, along with the per-channel rendering
 * metadata (name, visibility, color, contrast limits) from the image's `omero`
 * metadata. Images without a channel axis provide a single tile source that is
 * not addressed by channel.
 *
 * Extracts one sample per pixel from the OME-Zarr chunks of its tiles, which
 * the renderer contrast-stretches and colorizes. Integer chunks of up to 32
 * bits and floating-point chunks are passed through as they are; 64-bit
 * integer chunks are rejected, as their values cannot be represented in a
 * `NumericArray` without loss.
 *
 * Owns the object URL that the OME-Zarr image data provider creates for images
 * loaded from a workspace file, and revokes it on
 * {@link OMEZarrImageData.close}.
 */
export class OMEZarrImageData implements ImageData {
  private readonly _image: NgffImage;
  private readonly _tileSources: OMEZarrTileSource | OMEZarrTileSource[];
  private readonly _objectUrl: string | undefined;

  /**
   * @param image - The loaded OME-Zarr image, whose `omero` metadata provides
   * the per-channel rendering metadata of multi-channel image data
   * @param tileSources - One tile source per channel, in channel order, each
   * opened with `dataType: "ome-zarr"` and the channel selected, for images
   * with a channel axis; the single tile source, opened with
   * `dataType: "ome-zarr"`, for images without one
   * @param objectUrl - The object URL created for the workspace file the
   * image was loaded from, if any; revoked on {@link OMEZarrImageData.close}
   */
  constructor(
    image: NgffImage,
    tileSources: OMEZarrTileSource | OMEZarrTileSource[],
    objectUrl?: string,
  ) {
    this._image = image;
    this._tileSources = tileSources;
    this._objectUrl = objectUrl;
  }

  /** Returns the number of channels, or `undefined` for images without a channel axis */
  getSizeC(): number | undefined {
    return Array.isArray(this._tileSources)
      ? this._tileSources.length
      : undefined;
  }

  /**
   * Returns the tile source of a channel, or the only tile source of an image
   * without a channel axis
   *
   * @param c - The channel index (0-based), required for images with a channel
   * axis and to be omitted otherwise
   * @returns The tile source
   * @throws Error if `c` is omitted for an image with a channel axis, passed
   * for an image without one, or out of bounds
   */
  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    if (Array.isArray(this._tileSources)) {
      if (c === undefined) {
        throw new Error("Not a single-channel image");
      }
      const tileSource = this._tileSources[c];
      if (tileSource === undefined) {
        throw new Error(`Channel index ${c} is out of bounds`);
      }
      return tileSource;
    }
    if (c !== undefined) {
      throw new Error("Not a multi-channel image");
    }
    return this._tileSources;
  }

  /**
   * Extracts the samples of an invalidated tile from its OME-Zarr chunk
   *
   * The tile has to belong to an `OMEZarrTileSource` opened with
   * `dataType: "ome-zarr"`, whose tiles carry the two-dimensional (height x
   * width) chunk read from the zarr array (with the channel, z-slice and
   * timepoint already selected) instead of a rendered image.
   *
   * @param event - The tile invalidation event
   * @returns The samples of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster in pixels
   * @throws Error if the chunk holds 64-bit integers
   */
  async getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: NumericArray; width: number; height: number }> {
    const { chunk } = (await event.getData("ome-zarr")) as OMEZarrTileData;
    if (
      chunk.data instanceof BigInt64Array ||
      chunk.data instanceof BigUint64Array
    ) {
      throw new Error("64-bit integer data is not supported");
    }
    return {
      values: chunk.data,
      width: chunk.shape[1]!,
      height: chunk.shape[0]!,
    };
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

  /** Revokes the object URL of the workspace file this image was loaded from, if any */
  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
