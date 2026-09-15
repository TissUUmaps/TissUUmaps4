import type {
  CustomTileSource,
  ImageData,
  TileSourceConfig,
} from "@tissuumaps/core";

export class OpenSeadragonImageData implements ImageData {
  private readonly _tileSource: string | TileSourceConfig;
  private readonly _objectUrl: string | undefined;

  constructor(tileSource: string | TileSourceConfig, objectUrl?: string) {
    this._tileSource = tileSource;
    this._objectUrl = objectUrl;
  }

  getSizeC(): number | undefined {
    return undefined;
  }

  getTileSource(c?: number): string | TileSourceConfig | CustomTileSource {
    if (c !== undefined) {
      throw new Error("Not a multi-channel image");
    }
    return this._tileSource;
  }

  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
