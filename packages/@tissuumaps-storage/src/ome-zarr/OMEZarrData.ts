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

  /**
   * @param objectUrl - The object URL created for the workspace file this data
   * was loaded from, if any; revoked on {@link OMEZarrData.close}
   */
  constructor(objectUrl: string | undefined) {
    this._objectUrl = objectUrl;
  }

  abstract getTileSource(): string | TileSourceConfig | CustomTileSource;

  /**
   * Extracts the raw values of an invalidated tile from its OME-Zarr chunk
   *
   * Always provided by OME-Zarr data, as its tile sources are opened with
   * `dataType: "ome-zarr"` and therefore deliver chunks rather than colors
   * (see {@link OMEZarrData.getTileChunk}).
   *
   * @param event - The tile invalidation event
   * @returns The values of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster in pixels
   * @throws Error if the chunk's data type is not supported by this data type
   */
  abstract getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: NumericArray; width: number; height: number }>;

  /**
   * Extracts the OME-Zarr chunk of an invalidated tile
   *
   * The tile has to belong to an `OMEZarrTileSource` opened with
   * `dataType: "ome-zarr"`, whose tiles carry the chunk read from the zarr
   * array (with the channel, z-slice and timepoint already selected) instead
   * of a rendered image.
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

  /** Revokes the object URL of the workspace file this data was loaded from, if any */
  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
