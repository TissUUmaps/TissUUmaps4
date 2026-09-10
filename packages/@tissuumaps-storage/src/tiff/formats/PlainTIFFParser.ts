import type { GeoTIFF } from "geotiff";

import { TIFFUtils } from "../TIFFUtils";
import type { TIFFParser, TIFFStructure } from "./TIFFParser";

/**
 * Plain pyramidal TIFF: the largest IFDs are the channels, and the pyramid
 * levels are in SubIFDs or in smaller IFDs with the same aspect ratio. Accepts
 * every file, so it comes last.
 */
export class PlainTIFFParser implements TIFFParser {
  supports(): Promise<boolean> {
    return Promise.resolve(true);
  }

  /** @throws Error if `z` or `t` is not 0, which only OME-TIFF has */
  async load(
    tiff: GeoTIFF,
    options?: { z?: number; t?: number; signal?: AbortSignal },
  ): Promise<TIFFStructure> {
    const { z = 0, t = 0, signal } = options ?? {};
    signal?.throwIfAborted();
    if (z !== 0 || t !== 0) {
      throw new Error("z and t require an OME-TIFF file.");
    }
    const images = await TIFFUtils.readImages(tiff, { signal });
    const { full, reduced } = TIFFUtils.partitionBySize(images);
    const pyramids =
      (await TIFFUtils.readSubIFDPyramids(tiff, full, { signal })) ??
      TIFFUtils.groupByWidth(full, reduced);
    TIFFUtils.validatePyramids(pyramids);
    return {
      pyramids,
      channels: TIFFUtils.hasOwnColors(pyramids)
        ? undefined
        : TIFFUtils.fillMissingColors(full.map(() => ({}))),
    };
  }
}
