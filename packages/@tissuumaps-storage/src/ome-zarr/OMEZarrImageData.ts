import type OpenSeadragon from "openseadragon";

import type {
  CustomTileSource,
  ImageData,
  NumericArray,
  TileSourceConfig,
} from "@tissuumaps/core";

import { OMEZarrData } from "./OMEZarrData";

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
 */
export abstract class OMEZarrImageData
  extends OMEZarrData
  implements ImageData
{
  abstract getSizeC(): number | undefined;

  abstract getTileSource(
    c?: number,
  ): string | TileSourceConfig | CustomTileSource;

  /**
   * Extracts the samples of an invalidated tile from its OME-Zarr chunk
   *
   * @param event - The tile invalidation event
   * @returns The samples of the invalidated tile, one per raster pixel in
   * row-major order, along with the width and height of the raster in pixels
   * @throws Error if the chunk holds 64-bit integers
   */
  async getTileData(
    event: OpenSeadragon.TileInvalidatedEvent,
  ): Promise<{ values: NumericArray; width: number; height: number }> {
    const chunk = await OMEZarrData.getTileChunk(event);
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
}
