import type { OMEZarrTileData, OMEZarrTileSource } from "omezarr-tilesource";
import type OpenSeadragon from "openseadragon";

import type {
  CustomTileSource,
  LabelsData,
  TileSourceConfig,
  UintArray,
} from "@tissuumaps/core";

/**
 * Loaded OME-Zarr label image data
 *
 * Provides a single tile source whose chunks hold label IDs as unsigned
 * integers (see {@link OMEZarrLabelsData.getTileData}). Label IDs are not
 * enumerated up front: they are read per tile, so that arbitrarily large label
 * images can be opened without scanning them.
 *
 * Owns the object URL created for label images loaded from a workspace file
 * (see `openOMEZarr`), and revokes it on {@link OMEZarrLabelsData.close}.
 */
export class OMEZarrLabelsData implements LabelsData {
  private readonly _tileSource: OMEZarrTileSource;
  private readonly _objectUrl: string | undefined;

  /**
   * @param tileSource - The ready tile source of the label image, rendering a
   * single channel
   * @param objectUrl - The object URL created for the workspace file the label
   * image was loaded from, if any; revoked on {@link OMEZarrLabelsData.close}
   */
  constructor(tileSource: OMEZarrTileSource, objectUrl?: string) {
    this._tileSource = tileSource;
    this._objectUrl = objectUrl;
  }

  /** Returns the tile source of the label image */
  getTileSource(): string | TileSourceConfig | CustomTileSource {
    return this._tileSource;
  }

  /**
   * Extracts the label IDs of an invalidated tile from its OME-Zarr chunk
   *
   * The tile has to belong to an `OMEZarrTileSource` rendering a single
   * channel, whose tiles carry exactly one two-dimensional (height x width)
   * chunk read from the zarr array (with the channel, z-slice and timepoint
   * already selected) instead of a rendered image. Only unsigned integer
   * chunks of up to 32 bits are accepted, as label IDs have to be non-negative
   * integers and the renderer resolves them as such.
   *
   * @param event - The tile invalidation event
   * @returns The label IDs of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster in pixels
   * @throws Error if the tile does not carry exactly one chunk, or if the
   * chunk is not an 8-, 16- or 32-bit unsigned integer array
   */
  async getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: UintArray; width: number; height: number }> {
    const { chunks } = (await event.getData("ome-zarr")) as OMEZarrTileData;
    if (chunks.length !== 1) {
      throw new Error(`Expected a single chunk, got ${chunks.length}`);
    }
    const chunk = chunks[0]!;
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

  /** Revokes the object URL of the workspace file this label image was loaded from, if any */
  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
