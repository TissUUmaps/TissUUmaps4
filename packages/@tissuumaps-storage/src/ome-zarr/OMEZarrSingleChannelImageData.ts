import type { OMEZarrTileSource } from "omezarr-tilesource";

import type { CustomTileSource, TileSourceConfig } from "@tissuumaps/core";

import { OMEZarrImageData } from "./OMEZarrImageData";

/**
 * Loaded OME-Zarr image data without a channel axis
 *
 * Provides a single tile source that is not addressed by channel.
 */
export class OMEZarrSingleChannelImageData extends OMEZarrImageData {
  private readonly _tileSource: OMEZarrTileSource;

  /**
   * @param tileSource - The tile source of the image, opened with
   * `dataType: "ome-zarr"`
   * @param objectUrl - The object URL created for the workspace file the
   * image was loaded from, if any (see {@link OMEZarrImageData})
   */
  constructor(tileSource: OMEZarrTileSource, objectUrl?: string) {
    super(objectUrl);
    this._tileSource = tileSource;
  }

  /** Returns `undefined`, as this image data is not multi-channel */
  getSizeC(): undefined {
    return undefined;
  }

  /**
   * Returns the only tile source of the image
   *
   * @param c - Has to be omitted, as this image data is not multi-channel
   * @returns The tile source
   * @throws Error if `c` is passed
   */
  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    if (c !== undefined) {
      throw new Error("Not a multi-channel image");
    }
    return this._tileSource;
  }
}
