import type { OMEZarrTileData, OMEZarrTileSource } from "omezarr-tilesource";
import type OpenSeadragon from "openseadragon";

import type {
  CustomTileSource,
  IntArray,
  LabelsData,
  TileSourceConfig,
  UintArray,
} from "@tissuumaps/core";

/**
 * Loaded OME-Zarr label image data
 *
 * Provides a single tile source whose planes hold label IDs as signed or
 * unsigned integers (see {@link OMEZarrLabelsData.getTileData}). Label IDs are not
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
   * Extracts the label IDs of an invalidated tile from its OME-Zarr plane
   *
   * The tile has to belong to an `OMEZarrTileSource` rendering a single
   * channel, whose tiles carry exactly one two-dimensional (height x width)
   * plane read from the zarr array (with the channel, z-slice and timepoint
   * already selected) instead of a rendered image. Only integer planes of up
   * to 32 bits (signed or unsigned) are accepted, as label IDs have to be
   * integers and the renderer resolves them as such; 64-bit integers cannot be
   * represented without loss.
   *
   * @param event - The tile invalidation event
   * @returns The label IDs of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster in pixels
   * @throws Error if the tile does not carry exactly one plane, or if the
   * plane is not an 8-, 16- or 32-bit integer array
   */
  async getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: IntArray | UintArray; width: number; height: number }> {
    const { chunks: planes } = (await event.getData(
      "ome-zarr",
    )) as OMEZarrTileData;
    if (planes.length !== 1) {
      throw new Error(`Expected a single plane, got ${planes.length}`);
    }
    const plane = planes[0]!;
    if (
      plane.data instanceof Int8Array ||
      plane.data instanceof Int16Array ||
      plane.data instanceof Int32Array ||
      plane.data instanceof Uint8Array ||
      plane.data instanceof Uint16Array ||
      plane.data instanceof Uint32Array
    ) {
      return {
        values: plane.data,
        width: plane.shape[1]!,
        height: plane.shape[0]!,
      };
    }
    throw new Error(`Unsupported data type: ${plane.data.constructor.name}`);
  }

  /** Revokes the object URL of the workspace file this label image was loaded from, if any */
  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
