import type { GeoTIFFImage, Pool } from "geotiff";

import { MathUtils, type NumericArray } from "@tissuumaps/core";

/** The number of histogram bins */
const histogramBins = 1024;

/**
 * The pixels a histogram is built from; more do not make the quantiles more
 * stable. A level needs at least this many pixels to be read, and is cropped
 * to at most this many.
 */
const histogramPixels = 262144;

/** The `SampleFormat` value of floating point samples */
const sampleFormatFloat = 3;

/**
 * Reads the value histogram of every channel of a file
 *
 * The channels are read `poolSize` at a time, so that a file with many
 * channels does not start every read at once, and so that each read has a
 * decoder worker of the pool to itself.
 *
 * @param pyramids - The images of every channel, largest first
 * @param options - The decoder pool (`null` for the main thread), the number
 * of channels to read at a time (default `1`), and an abort signal
 * @returns One histogram per channel, in channel order, each as returned by
 * {@link readChannelHistogram}
 * @throws Error if a channel has no pyramid level
 */
export async function readChannelHistograms(
  pyramids: GeoTIFFImage[][],
  options?: { pool?: Pool | null; poolSize?: number; signal?: AbortSignal },
): Promise<({ hist: number[]; range: [number, number] } | undefined)[]> {
  const { pool = null, poolSize = 1, signal } = options ?? {};
  signal?.throwIfAborted();
  const histograms: (
    { hist: number[]; range: [number, number] } | undefined
  )[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(poolSize, pyramids.length) }, async () => {
      for (let c = next++; c < pyramids.length; c = next++) {
        histograms[c] = await readChannelHistogram(pyramids[c]!, {
          pool,
          signal,
        });
      }
    }),
  );
  return histograms;
}

/**
 * Reads the value histogram of a channel, which the renderer stretches the
 * channel over, since TIFF stores no display range
 *
 * Integers of 8 bits or fewer get no histogram, and no pixels are read for
 * them: the renderer stretches them over the range of their data type, like
 * other viewers show them. Wider integers and floats get the histogram of a
 * centered crop of the smallest pyramid level that has enough pixels.
 *
 * @param pyramid - The images of the channel, largest first
 * @param options - The decoder pool (`null` for the main thread) and an abort
 * signal
 * @returns The histogram, as bin counts and the value range they span, or
 * `undefined` for a channel that needs none or holds fewer than two distinct
 * values
 * @throws Error if `pyramid` is empty
 */
export async function readChannelHistogram(
  pyramid: GeoTIFFImage[],
  options?: { pool?: Pool | null; signal?: AbortSignal },
): Promise<{ hist: number[]; range: [number, number] } | undefined> {
  const { pool = null, signal } = options ?? {};
  signal?.throwIfAborted();
  const full = pyramid[0];
  if (full === undefined) {
    throw new Error("The channel has no pyramid level.");
  }
  if (!needsHistogram(full)) {
    return undefined;
  }
  return await readFromPixels(pickLevel(pyramid), { pool, signal });
}

/**
 * Whether the range of the channel's data type is too wide to stretch it over,
 * which is the case for everything but integers of 8 bits or fewer
 */
function needsHistogram(image: GeoTIFFImage): boolean {
  const bits = image.getBitsPerSample(0) || 1; // BitsPerSample defaults to 1
  return image.getSampleFormat(0) === sampleFormatFloat || bits > 8;
}

/** The smallest level with enough pixels for a stable histogram */
function pickLevel(pyramid: GeoTIFFImage[]): GeoTIFFImage {
  const largeEnough = pyramid.filter(
    (image) => image.getWidth() * image.getHeight() >= histogramPixels,
  );
  return largeEnough[largeEnough.length - 1] ?? pyramid[0]!;
}

async function readFromPixels(
  image: GeoTIFFImage,
  options: { pool: Pool | null; signal: AbortSignal | undefined },
): Promise<{ hist: number[]; range: [number, number] } | undefined> {
  const { pool, signal } = options;
  // a single sample, interleaved, is read as one typed array
  const values = (await image.readRasters({
    window: getCenteredWindow(image, histogramPixels),
    samples: [0],
    interleave: true,
    pool,
    signal,
  })) as unknown as NumericArray;

  const range = await MathUtils.computeRange(values, { signal });
  // a channel without finite values, or with a single one, has no range to
  // spread bins over; the renderer falls back to its data type range
  if (!(range[1] > range[0])) {
    return undefined;
  }

  return await MathUtils.computeHistogram(values, range, histogramBins, {
    signal,
  });
}

/**
 * Returns a centered crop of at most `maxPixels`, aligned to the tile grid so
 * that no tile is decoded for a few edge pixels. Strip-stored images report
 * the full width as tile width, so their crop spans the width and as many
 * strips as fit.
 */
function getCenteredWindow(
  image: GeoTIFFImage,
  maxPixels: number,
): [number, number, number, number] {
  const imageWidth = image.getWidth();
  const imageHeight = image.getHeight();
  const tileWidth = Math.max(1, image.getTileWidth());
  const tileHeight = Math.max(1, image.getTileHeight());
  const scale = Math.min(1, Math.sqrt(maxPixels / (imageWidth * imageHeight)));
  const width = Math.min(
    imageWidth,
    Math.ceil((imageWidth * scale) / tileWidth) * tileWidth,
  );
  const height = Math.min(
    imageHeight,
    Math.max(
      tileHeight,
      Math.floor(maxPixels / width / tileHeight) * tileHeight,
    ),
  );
  const left = Math.floor((imageWidth - width) / 2 / tileWidth) * tileWidth;
  const top = Math.floor((imageHeight - height) / 2 / tileHeight) * tileHeight;
  return [left, top, left + width, top + height];
}
