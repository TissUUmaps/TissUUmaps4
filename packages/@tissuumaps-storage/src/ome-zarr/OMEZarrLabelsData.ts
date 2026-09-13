import type { OMEZarrTileData, OMEZarrTileSource } from "omezarr-tilesource";
import type OpenSeadragon from "openseadragon";

import type {
  CustomTileSource,
  LabelsData,
  TileSourceConfig,
  UintArray,
} from "@tissuumaps/core";

export class OMEZarrLabelsData implements LabelsData {
  private readonly _tileSource: OMEZarrTileSource;
  private readonly _objectUrl?: string;

  constructor(tileSource: OMEZarrTileSource, objectUrl?: string) {
    this._tileSource = tileSource;
    this._objectUrl = objectUrl;
  }

  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this._tileSource;
  }

  async getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: UintArray; width: number; height: number }> {
    const { chunk } = (await event.getData("ome-zarr")) as OMEZarrTileData;
    const [height, width] = chunk.shape as [number, number];
    let values: UintArray;
    if (
      chunk.data instanceof Uint8Array ||
      chunk.data instanceof Uint16Array ||
      chunk.data instanceof Uint32Array
    ) {
      values = chunk.data;
    } else if (
      chunk.data instanceof BigInt64Array ||
      chunk.data instanceof BigUint64Array
    ) {
      values = Uint32Array.from(chunk.data, Number);
    } else {
      values = new Uint32Array(chunk.data);
    }
    return { values, width, height };
  }

  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
