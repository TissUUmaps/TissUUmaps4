import type { OMEZarrTileData } from "omezarr-tilesource";
import type OpenSeadragon from "openseadragon";

import type {
  CustomTileSource,
  NumericArray,
  RasterData,
  TileSourceConfig,
} from "@tissuumaps/core";

/**
 * Base class for loaded OME-Zarr data
 *
 * Owns the object URL that the OME-Zarr data provider creates for data loaded
 * from a workspace file, and revokes it on {@link OMEZarrData.close}.
 */
export abstract class OMEZarrData implements RasterData {
  private readonly _objectUrl: string | undefined;

  constructor(objectUrl: string | undefined) {
    this._objectUrl = objectUrl;
  }

  abstract getTileSource(): string | TileSourceConfig | CustomTileSource;

  abstract getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: NumericArray; width: number; height: number }>;

  /**
   * Extracts the OME-Zarr chunk of an invalidated tile
   *
   * @param event - The tile invalidation event
   * @returns The two-dimensional (height x width) chunk of the tile
   */
  protected static async getTileChunk(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<OMEZarrTileData["chunk"]> {
    const { chunk } = (await event.getData("ome-zarr")) as OMEZarrTileData;
    return chunk;
  }

  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
