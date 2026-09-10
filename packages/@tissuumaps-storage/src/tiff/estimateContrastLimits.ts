import type { GeoTIFFImage, Pool } from "geotiff";

/** The quantiles the estimated contrast limits are placed at */
const lowQuantile = 0.01;
const highQuantile = 0.999;

/** The number of histogram bins */
const histogramBins = 1024;

/** The most pixels read for an estimate; more do not make the quantiles more stable */
const maxHistogramPixels = 262144;

/** The `SampleFormat` values the full range depends on; 1 is unsigned integer */
const sampleFormatSigned = 2;
const sampleFormatFloat = 3;

/**
 * Estimates the contrast limits of a channel, since TIFF stores no display
 * range
 *
 * Integers of 8 bits or fewer get their full range, like other viewers show
 * them, without reading pixels. Wider integers and floats get the 1% and 99.9%
 * quantiles of a centered crop of the smallest pyramid level that has enough
 * pixels.
 *
 * @param pyramid - The images of the channel, largest first
 * @param options - The decoder pool (`null` for the main thread) and an abort
 * signal
 * @returns The limits, in raw pixel values; a uniform image gets a unit range
 * @throws Error if `pyramid` is empty
 */
export async function estimateContrastLimits(
  pyramid: GeoTIFFImage[],
  options?: { pool?: Pool | null; signal?: AbortSignal },
): Promise<[number, number]> {
  const { pool = null, signal } = options ?? {};
  signal?.throwIfAborted();
  const full = pyramid[0];
  if (full === undefined) {
    throw new Error("The channel has no pyramid level.");
  }
  return (
    getFullRange(full) ??
    estimateFromPixels(pickLevel(pyramid), { pool, signal })
  );
}

/** The full range of integers of 8 bits or fewer, `undefined` otherwise */
function getFullRange(image: GeoTIFFImage): [number, number] | undefined {
  const bits = image.getBitsPerSample(0) || 1; // BitsPerSample defaults to 1
  const format = image.getSampleFormat(0);
  if (format === sampleFormatFloat || bits > 8) {
    return undefined;
  }
  return format === sampleFormatSigned
    ? [-(2 ** (bits - 1)), 2 ** (bits - 1) - 1]
    : [0, 2 ** bits - 1];
}

/** The smallest level with enough pixels for stable quantiles */
function pickLevel(pyramid: GeoTIFFImage[]): GeoTIFFImage {
  const largeEnough = pyramid.filter(
    (image) => image.getWidth() * image.getHeight() >= maxHistogramPixels,
  );
  return largeEnough[largeEnough.length - 1] ?? pyramid[0]!;
}

async function estimateFromPixels(
  image: GeoTIFFImage,
  options: { pool: Pool | null; signal: AbortSignal | undefined },
): Promise<[number, number]> {
  const { pool, signal } = options;
  const values = await image.readRasters({
    window: getCenteredWindow(image, maxHistogramPixels),
    samples: [0],
    interleave: true,
    pool,
    signal,
  });

  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const value of values) {
    if (Number.isFinite(value)) {
      min = Math.min(min, value);
      max = Math.max(max, value);
      count++;
    }
  }
  if (count === 0) {
    return [0, 1];
  }
  if (!(max > min)) {
    return [min, min + 1];
  }

  const histogram = new Float64Array(histogramBins);
  const binScale = histogramBins / (max - min);
  for (const value of values) {
    if (Number.isFinite(value)) {
      const bin = Math.min(
        histogramBins - 1,
        Math.floor((value - min) * binScale),
      );
      histogram[bin]! += 1;
    }
  }

  return [
    quantile(histogram, count, lowQuantile, min, max),
    quantile(histogram, count, highQuantile, min, max),
  ];
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

/** Returns the value at quantile `q`, interpolated within its bin */
function quantile(
  histogram: Float64Array,
  total: number,
  q: number,
  min: number,
  max: number,
): number {
  const threshold = q * total;
  let cumulative = 0;
  for (let bin = 0; bin < histogram.length; bin++) {
    const count = histogram[bin]!;
    if (cumulative + count >= threshold) {
      const fraction = count > 0 ? (threshold - cumulative) / count : 0;
      return min + ((bin + fraction) / histogram.length) * (max - min);
    }
    cumulative += count;
  }
  return max;
}
