import type { OMEZarrTileSource } from "omezarr-tilesource";

import type {
  CustomTileSource,
  ImageData,
  TileSourceConfig,
} from "@tissuumaps/core";

export class OMEZarrImageData implements ImageData {
  private readonly _tileSources: OMEZarrTileSource[];
  private readonly _objectUrl?: string;

  constructor(tileSources: OMEZarrTileSource[], objectUrl?: string) {
    this._tileSources = tileSources;
    this._objectUrl = objectUrl;
  }

  getSizeC(): number | undefined {
    throw new Error("Method not implemented.");
  }

  getChannelNames(): string[] | undefined {
    throw new Error("Method not implemented.");
  }

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    if (c === undefined) {
      if (this._tileSources.length !== 1) {
        throw new Error("Multi-channel images require a channel index");
      }
      return this._tileSources[0]!;
    }
    if (c < 0 || c >= this._tileSources.length) {
      throw new Error(`Channel index ${c} is out of bounds`);
    }
    return this._tileSources[c]!;
  }

  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
