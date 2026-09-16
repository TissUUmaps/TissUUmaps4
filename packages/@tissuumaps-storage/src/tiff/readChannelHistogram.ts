import type { GeoTIFFImage, Pool } from "geotiff";

import { MathUtils, type NumericArray } from "@tissuumaps/core";

/**
 * The pixels a histogram is built from; more do not make the quantiles more
 * stable. A level needs at least this many pixels to be read, and is cropped
 * to roughly this many, rounded out to whole tiles or strips (see
 * {@link getCenteredWindow}).
 */
const histogramPixels = 262144;

/**
 * Reads the value histogram of every channel of a file
 *
 * At most `concurrency` channels are read at a time, so that a file with many
 * channels does not start every read at once. The decode jobs of a read are
 * spread over the whole pool, so this bounds the reads in flight, not the
 * workers each of them uses.
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
  options?: { pool?: Pool | null; concurrency?: number; signal?: AbortSignal },
): Promise<({ hist: number[]; range: [number, number] } | undefined)[]> {
  const { pool = null, concurrency = 1, signal } = options ?? {};
  signal?.throwIfAborted();
  const histograms: (
    { hist: number[]; range: [number, number] } | undefined
  )[] = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, pyramids.length) }, async () => {
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
 * The histogram is read from a centered crop of the smallest pyramid level
 * that has enough pixels.
 *
 * @param pyramid - The images of the channel, largest first
 * @param options - The decoder pool (`null` for the main thread) and an abort
 * signal
 * @returns The histogram, as bin counts and the value range they span, or
 * `undefined` for a channel that holds fewer than two distinct values
 * @throws Error if `pyramid` is empty
 */
export async function readChannelHistogram(
  pyramid: GeoTIFFImage[],
  options?: { pool?: Pool | null; signal?: AbortSignal },
): Promise<{ hist: number[]; range: [number, number] } | undefined> {
  const { pool = null, signal } = options ?? {};
  signal?.throwIfAborted();
  if (pyramid.length === 0) {
    throw new Error("The channel has no pyramid level.");
  }
  return await readFromPixels(pickLevel(pyramid), { pool, signal });
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

  return await MathUtils.computeHistogram(values, range, { signal });
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
