import type { OMEZarrTileSource } from "omezarr-tilesource";

import type {
  CustomTileSource,
  ImageData,
  TileSourceConfig,
} from "@tissuumaps/core";

export class OMEZarrImageData implements ImageData {
  private readonly _tileSource: OMEZarrTileSource | undefined;
  private readonly _tileSources: OMEZarrTileSource[] | undefined;
  private readonly _objectUrl?: string;

  constructor(
    tileSource: OMEZarrTileSource | undefined,
    tileSources: OMEZarrTileSource[] | undefined,
    objectUrl?: string,
  ) {
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
      if (c < 0 || c >= this._tileSources.length) {
        throw new Error(`Channel index ${c} is out of bounds`);
      }
      return this._tileSources[c]!;
    }
    if (this._tileSource === undefined) {
      throw new Error("Not a single-channel image");
    }
    return this._tileSource;
  }

  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
