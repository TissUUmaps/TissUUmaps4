import { type OMEZarrTileSource } from "omezarr-tilesource";

import {
  type CustomTileSource,
  type ImageData,
  type TileSourceConfig,
} from "@tissuumaps/core";

export class OMEZarrImageData implements ImageData {
  private readonly _tileSource: OMEZarrTileSource;
  private readonly _objectUrl?: string;

  constructor(tileSource: OMEZarrTileSource, objectUrl?: string) {
    this._tileSource = tileSource;
    this._objectUrl = objectUrl;
  }

  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this._tileSource;
  }

  close(): void {
    if (this._objectUrl) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
