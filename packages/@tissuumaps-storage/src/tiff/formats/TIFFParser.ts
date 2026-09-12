import type { GeoTIFF, GeoTIFFImage } from "geotiff";

import type { Color } from "@tissuumaps/core";

import { OMETIFFParser } from "./OMETIFFParser";
import { PlainTIFFParser } from "./PlainTIFFParser";
import { QPTIFFParser } from "./QPTIFFParser";

/** A channel of a multi-channel TIFF file */
export type TIFFChannel = {
  name?: string;
  color?: Color;
  contrastLimits?: [number, number];
};

/** The pyramid and channel metadata of a TIFF file */
export type TIFFStructure = {
  /** One pyramid per channel, largest image first; a single one for RGB images */
  pyramids: GeoTIFFImage[][];

  /** `undefined` for RGB images */
  channels: TIFFChannel[] | undefined;
};

/** Reads the structure of one TIFF flavor */
export type TIFFParser = {
  /**
   * Whether this parser reads the file
   *
   * @param tiff - The opened file
   * @param options - An abort signal
   * @returns Whether the file is of this parser's format
   */
  supports(tiff: GeoTIFF, options?: { signal?: AbortSignal }): Promise<boolean>;

  /**
   * Reads the structure of the file
   *
   * @param tiff - The opened file
   * @param options - The z-plane and time point (default `0`, only OME-TIFF
   * has them), and an abort signal
   * @returns The structure
   */
  load(
    tiff: GeoTIFF,
    options?: { z?: number; t?: number; signal?: AbortSignal },
  ): Promise<TIFFStructure>;
};

/** The parsers in detection order; the plain parser accepts any file */
export const tiffParsers: TIFFParser[] = [
  new OMETIFFParser(),
  new QPTIFFParser(),
  new PlainTIFFParser(),
];

/**
 * Finds the parser for a file
 *
 * @param tiff - The opened file
 * @param options - An abort signal
 * @returns The first parser that supports the file
 */
export async function findTIFFParser(
  tiff: GeoTIFF,
  options?: { signal?: AbortSignal },
): Promise<TIFFParser> {
  const { signal } = options ?? {};
  signal?.throwIfAborted();
  for (const parser of tiffParsers) {
    if (await parser.supports(tiff, { signal })) {
      return parser;
    }
  }
  throw new Error("No parser supports the TIFF file.");
}
