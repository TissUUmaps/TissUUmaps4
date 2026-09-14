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
 */
export abstract class OMEZarrImageData
  extends OMEZarrData
  implements ImageData
{
  abstract getSizeC(): number | undefined;

  abstract getTileSource(
    c?: number,
  ): string | TileSourceConfig | CustomTileSource;

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
