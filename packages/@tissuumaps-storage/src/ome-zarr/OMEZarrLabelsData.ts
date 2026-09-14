import type { OMEZarrTileSource } from "omezarr-tilesource";
import type OpenSeadragon from "openseadragon";

import type {
  CustomTileSource,
  LabelsData,
  TileSourceConfig,
  UintArray,
} from "@tissuumaps/core";

import { OMEZarrData } from "./OMEZarrData";

export class OMEZarrLabelsData extends OMEZarrData implements LabelsData {
  private readonly _tileSource: OMEZarrTileSource;

  constructor(tileSource: OMEZarrTileSource, objectUrl?: string) {
    super(objectUrl);
    this._tileSource = tileSource;
  }

  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this._tileSource;
  }

  async getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: UintArray; width: number; height: number }> {
    const chunk = await OMEZarrData.getTileChunk(event);
    if (
      chunk.data instanceof Uint8Array ||
      chunk.data instanceof Uint16Array ||
      chunk.data instanceof Uint32Array
    ) {
      return {
        values: chunk.data,
        width: chunk.shape[1]!,
        height: chunk.shape[0]!,
      };
    }
    throw new Error(`Unsupported data type: ${chunk.data.constructor.name}`);
  }
}
