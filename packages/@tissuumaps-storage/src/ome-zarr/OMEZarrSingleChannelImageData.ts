import type { OMEZarrTileSource } from "omezarr-tilesource";

import type { CustomTileSource, TileSourceConfig } from "@tissuumaps/core";

import { OMEZarrImageData } from "./OMEZarrImageData";

/**
 * Loaded OME-Zarr image data without a channel axis or with a single channel
 *
 * Provides a single tile source that is not addressed by channel.
 */
export class OMEZarrSingleChannelImageData extends OMEZarrImageData {
  private readonly _tileSource: OMEZarrTileSource;

  constructor(tileSource: OMEZarrTileSource, objectUrl?: string) {
    super(objectUrl);
    this._tileSource = tileSource;
  }

  getSizeC(): undefined {
    return undefined;
  }

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    if (c !== undefined) {
      throw new Error("Not a multi-channel image");
    }
    return this._tileSource;
  }
}
