import {
  type GeoTIFF,
  type GeoTIFFImage,
  fromArrayBuffer,
  writeArrayBuffer,
} from "geotiff";
import { describe, expect, it, vi } from "vitest";

import { estimateContrastLimits } from "./estimateContrastLimits";

function fakeRead(values: number[] = [0, 1]) {
  return vi.fn(() => Promise.resolve(Float64Array.from(values)));
}

// 16-bit unsigned by default, so that the estimate runs; a strip-stored image
// reports its full width as tile width and the rows per strip as tile height
function fakeImage(
  width: number,
  height: number,
  options?: {
    bits?: number;
    format?: number;
    tileWidth?: number;
    tileHeight?: number;
    readRasters?: ReturnType<typeof fakeRead>;
  },
): GeoTIFFImage {
  const {
    bits = 16,
    format = 1,
    tileWidth = 256,
    tileHeight = 256,
    readRasters = fakeRead(),
  } = options ?? {};
  return {
    getWidth: () => width,
    getHeight: () => height,
    getTileWidth: () => tileWidth,
    getTileHeight: () => tileHeight,
    getBitsPerSample: () => bits,
    getSampleFormat: () => format,
    readRasters,
  } as unknown as GeoTIFFImage;
}

describe("estimateContrastLimits", () => {
  it("gives integers of 8 bits or fewer their full range without reading", async () => {
    const readRasters = fakeRead();
    await expect(
      estimateContrastLimits([fakeImage(10, 10, { bits: 8, readRasters })]),
    ).resolves.toEqual([0, 255]);
    await expect(
      estimateContrastLimits([fakeImage(10, 10, { bits: 8, format: 2 })]),
    ).resolves.toEqual([-128, 127]);
    await expect(
      estimateContrastLimits([fakeImage(10, 10, { bits: 1 })]),
    ).resolves.toEqual([0, 1]);
    await expect(
      estimateContrastLimits([fakeImage(10, 10, { bits: 0 })]),
    ).resolves.toEqual([0, 1]);
    expect(readRasters).not.toHaveBeenCalled();
  });

  it("reads the smallest level with enough pixels", async () => {
    const sizes = [4096, 1024, 512, 64];
    const reads = sizes.map(() => fakeRead());
    const pyramid = sizes.map((size, i) =>
      fakeImage(size, size, { readRasters: reads[i] }),
    );
    await estimateContrastLimits(pyramid);
    expect(reads.map((read) => read.mock.calls.length)).toEqual([0, 0, 1, 0]);
  });

  it("falls back to the largest level of a small image", async () => {
    const reads = [fakeRead(), fakeRead()];
    const pyramid = [
      fakeImage(100, 100, { readRasters: reads[0] }),
      fakeImage(50, 50, { readRasters: reads[1] }),
    ];
    await estimateContrastLimits(pyramid);
    expect(reads.map((read) => read.mock.calls.length)).toEqual([1, 0]);
  });

  it("rejects a channel without levels", async () => {
    await expect(estimateContrastLimits([])).rejects.toThrow();
  });

  it("places the limits at the low and high quantiles", async () => {
    const values = Array.from({ length: 1000 }, (_, i) => i);
    const [min, max] = await estimateContrastLimits([
      fakeImage(500, 400, { readRasters: fakeRead(values) }),
    ]);
    expect(min).toBeCloseTo(9.76, 1);
    expect(max).toBeCloseTo(998.02, 1);
  });

  it("interpolates the quantile within its histogram bin", async () => {
    const values = [
      ...Array.from({ length: 50 }, () => 0),
      ...Array.from({ length: 50 }, () => 100),
    ];
    const [min, max] = await estimateContrastLimits([
      fakeImage(10, 10, { readRasters: fakeRead(values) }),
    ]);
    expect(min).toBeCloseTo(0, 2);
    expect(max).toBeCloseTo(100, 2);
  });

  it("gives a uniform image a unit range", async () => {
    await expect(
      estimateContrastLimits([
        fakeImage(10, 10, { readRasters: fakeRead([7, 7, 7]) }),
      ]),
    ).resolves.toEqual([7, 8]);
  });

  it("ignores samples that are not finite", async () => {
    await expect(
      estimateContrastLimits([
        fakeImage(10, 10, { readRasters: fakeRead([NaN, 7, 7, Infinity]) }),
      ]),
    ).resolves.toEqual([7, 8]);
  });

  it("reads small images in full", async () => {
    const readRasters = fakeRead();
    await estimateContrastLimits([fakeImage(500, 400, { readRasters })]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [0, 0, 500, 400] }),
    );
  });

  it("samples large images through a centered crop", async () => {
    const readRasters = fakeRead();
    await estimateContrastLimits([fakeImage(4096, 4096, { readRasters })]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [1792, 1792, 2304, 2304] }),
    );
  });

  it("snaps the crop to the tile grid", async () => {
    const readRasters = fakeRead();
    await estimateContrastLimits([
      fakeImage(4096, 4096, { readRasters, tileWidth: 1024, tileHeight: 1024 }),
    ]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [1024, 1024, 2048, 2048] }),
    );
  });

  it("crops a strip-stored image to whole strips at the full width", async () => {
    const readRasters = fakeRead();
    await estimateContrastLimits([
      fakeImage(4096, 4096, { readRasters, tileWidth: 4096, tileHeight: 64 }),
    ]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [0, 1984, 4096, 2048] }),
    );
  });

  it("reads at least one strip of a wide strip-stored image", async () => {
    const readRasters = fakeRead();
    await estimateContrastLimits([
      fakeImage(20000, 15000, {
        readRasters,
        tileWidth: 20000,
        tileHeight: 64,
      }),
    ]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [0, 7424, 20000, 7488] }),
    );
  });

  it("rejects when aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      estimateContrastLimits([fakeImage(10, 10)], {
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("estimates the contrast limits of a written file", async () => {
    const values = Uint16Array.from({ length: 64 }, (_, i) => i * 100);
    const buffer = writeArrayBuffer(values, {
      width: 8,
      height: 8,
      SamplesPerPixel: [1],
      BitsPerSample: [16],
      PhotometricInterpretation: 1,
    });
    const tiff: GeoTIFF = await fromArrayBuffer(buffer);
    const [min, max] = await estimateContrastLimits([await tiff.getImage(0)]);
    expect(min).toBeGreaterThanOrEqual(0);
    expect(min).toBeLessThan(max);
    expect(max).toBeLessThanOrEqual(6300);
  });
});
