import type { OMEZarrTileSource } from "omezarr-tilesource";
import type OpenSeadragon from "openseadragon";

import type {
  CustomTileSource,
  LabelsData,
  TileSourceConfig,
  UintArray,
} from "@tissuumaps/core";

import { OMEZarrData } from "./OMEZarrData";

/**
 * Loaded OME-Zarr label image data
 *
 * Provides a single tile source whose chunks hold label IDs as unsigned
 * integers. Label IDs are not enumerated up front: they are read per tile,
 * so that arbitrarily large label images can be opened without scanning them.
 */
export class OMEZarrLabelsData extends OMEZarrData implements LabelsData {
  private readonly _tileSource: OMEZarrTileSource;

  /**
   * @param tileSource - The tile source of the label image, opened with
   * `dataType: "ome-zarr"`
   * @param objectUrl - The object URL created for the workspace file the label
   * image was loaded from, if any (see {@link OMEZarrData})
   */
  constructor(tileSource: OMEZarrTileSource, objectUrl?: string) {
    super(objectUrl);
    this._tileSource = tileSource;
  }

  /** Returns the tile source of the label image */
  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this._tileSource;
  }

  /**
   * Extracts the label IDs of an invalidated tile from its OME-Zarr chunk
   *
   * Only unsigned integer chunks of up to 32 bits are accepted, as label IDs
   * have to be non-negative integers and the renderer resolves them as such.
   *
   * @param event - The tile invalidation event
   * @returns The label IDs of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster in pixels
   * @throws Error if the chunk is not an 8-, 16- or 32-bit unsigned integer
   * array
   */
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
