import type { OMEZarrTileData } from "omezarr-tilesource";
import type OpenSeadragon from "openseadragon";

import type {
  CustomTileSource,
  ImageData,
  NumericArray,
  TileSourceConfig,
} from "@tissuumaps/core";

/**
 * Base class for loaded OME-Zarr image data
 *
 * Extracts one sample per pixel from the OME-Zarr chunks of its tiles, which
 * the renderer contrast-stretches and colorizes; subclasses provide the tile
 * source(s) (see `OMEZarrSingleChannelImageData` and
 * `OMEZarrMultiChannelImageData`).
 *
 * Integer chunks of up to 32 bits and floating-point chunks are passed
 * through as they are; 64-bit integer chunks are rejected, as their values
 * cannot be represented in a `NumericArray` without loss.
 *
 * Owns the object URL that the OME-Zarr image data provider creates for images
 * loaded from a workspace file, and revokes it on
 * {@link OMEZarrImageData.close}.
 */
export abstract class OMEZarrImageData implements ImageData {
  private readonly _objectUrl: string | undefined;

  /**
   * @param objectUrl - The object URL created for the workspace file this
   * image was loaded from, if any; revoked on {@link OMEZarrImageData.close}
   */
  constructor(objectUrl: string | undefined) {
    this._objectUrl = objectUrl;
  }

  abstract getSizeC(): number | undefined;

  abstract getTileSource(
    c?: number,
  ): string | TileSourceConfig | CustomTileSource;

  /**
   * Extracts the samples of an invalidated tile from its OME-Zarr chunk
   *
   * The tile has to belong to an `OMEZarrTileSource` opened with
   * `dataType: "ome-zarr"`, whose tiles carry the two-dimensional (height x
   * width) chunk read from the zarr array (with the channel, z-slice and
   * timepoint already selected) instead of a rendered image.
   *
   * @param event - The tile invalidation event
   * @returns The samples of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster in pixels
   * @throws Error if the chunk holds 64-bit integers
   */
  async getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: NumericArray; width: number; height: number }> {
    const { chunk } = (await event.getData("ome-zarr")) as OMEZarrTileData;
    if (
      chunk.data instanceof BigInt64Array ||
      chunk.data instanceof BigUint64Array
    ) {
      throw new Error("64-bit integer data is not supported");
    }
    return {
      values: chunk.data,
      width: chunk.shape[1]!,
      height: chunk.shape[0]!,
    };
  }

  /** Revokes the object URL of the workspace file this image was loaded from, if any */
  close(): void {
    if (this._objectUrl !== undefined) {
      URL.revokeObjectURL(this._objectUrl);
    }
  }
}
