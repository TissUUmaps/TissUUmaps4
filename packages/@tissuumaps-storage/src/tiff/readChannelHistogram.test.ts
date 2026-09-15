import {
  type GeoTIFF,
  type GeoTIFFImage,
  fromArrayBuffer,
  writeArrayBuffer,
} from "geotiff";
import { describe, expect, it, vi } from "vitest";

import { readChannelHistogram } from "./readChannelHistogram";

function fakeRead(values: number[] = [0, 1]) {
  return vi.fn(() => Promise.resolve(Float64Array.from(values)));
}

// 16-bit unsigned by default, so that the histogram is read; a strip-stored image
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

describe("readChannelHistogram", () => {
  it("gives integers of 8 bits or fewer no histogram, without reading", async () => {
    const readRasters = fakeRead();
    for (const options of [
      { bits: 8, readRasters },
      { bits: 8, format: 2 },
      { bits: 1 },
      { bits: 0 },
    ]) {
      await expect(
        readChannelHistogram([fakeImage(10, 10, options)]),
      ).resolves.toBeUndefined();
    }
    expect(readRasters).not.toHaveBeenCalled();
  });

  it("reads the smallest level with enough pixels", async () => {
    const sizes = [4096, 1024, 512, 64];
    const reads = sizes.map(() => fakeRead());
    const pyramid = sizes.map((size, i) =>
      fakeImage(size, size, { readRasters: reads[i] }),
    );
    await readChannelHistogram(pyramid);
    expect(reads.map((read) => read.mock.calls.length)).toEqual([0, 0, 1, 0]);
  });

  it("falls back to the largest level of a small image", async () => {
    const reads = [fakeRead(), fakeRead()];
    const pyramid = [
      fakeImage(100, 100, { readRasters: reads[0] }),
      fakeImage(50, 50, { readRasters: reads[1] }),
    ];
    await readChannelHistogram(pyramid);
    expect(reads.map((read) => read.mock.calls.length)).toEqual([1, 0]);
  });

  it("rejects a channel without levels", async () => {
    await expect(readChannelHistogram([])).rejects.toThrow();
  });

  it("spans the range of the values and counts every one of them", async () => {
    const values = Array.from({ length: 1000 }, (_, i) => i);
    const histogram = await readChannelHistogram([
      fakeImage(500, 400, { readRasters: fakeRead(values) }),
    ]);
    expect(histogram?.range).toEqual([0, 999]);
    expect(histogram?.hist.reduce((sum, count) => sum + count, 0)).toBe(1000);
  });

  it("counts the lowest and highest values in the outermost bins", async () => {
    const values = [
      ...Array.from({ length: 50 }, () => 0),
      ...Array.from({ length: 50 }, () => 100),
    ];
    const histogram = await readChannelHistogram([
      fakeImage(10, 10, { readRasters: fakeRead(values) }),
    ]);
    expect(histogram?.range).toEqual([0, 100]);
    expect(histogram?.hist[0]).toBe(50);
    expect(histogram?.hist[histogram.hist.length - 1]).toBe(50);
  });

  it("gives a channel with fewer than two distinct values no histogram", async () => {
    await expect(
      readChannelHistogram([
        fakeImage(10, 10, { readRasters: fakeRead([7, 7, 7]) }),
      ]),
    ).resolves.toBeUndefined();
  });

  it("ignores samples that are not finite", async () => {
    const histogram = await readChannelHistogram([
      fakeImage(10, 10, { readRasters: fakeRead([NaN, 1, 9, Infinity]) }),
    ]);
    expect(histogram?.range).toEqual([1, 9]);
    expect(histogram?.hist.reduce((sum, count) => sum + count, 0)).toBe(2);
  });

  it("reads small images in full", async () => {
    const readRasters = fakeRead();
    await readChannelHistogram([fakeImage(500, 400, { readRasters })]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [0, 0, 500, 400] }),
    );
  });

  it("samples large images through a centered crop", async () => {
    const readRasters = fakeRead();
    await readChannelHistogram([fakeImage(4096, 4096, { readRasters })]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [1792, 1792, 2304, 2304] }),
    );
  });

  it("snaps the crop to the tile grid", async () => {
    const readRasters = fakeRead();
    await readChannelHistogram([
      fakeImage(4096, 4096, { readRasters, tileWidth: 1024, tileHeight: 1024 }),
    ]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [1024, 1024, 2048, 2048] }),
    );
  });

  it("crops a strip-stored image to whole strips at the full width", async () => {
    const readRasters = fakeRead();
    await readChannelHistogram([
      fakeImage(4096, 4096, { readRasters, tileWidth: 4096, tileHeight: 64 }),
    ]);
    expect(readRasters).toHaveBeenCalledWith(
      expect.objectContaining({ window: [0, 1984, 4096, 2048] }),
    );
  });

  it("reads at least one strip of a wide strip-stored image", async () => {
    const readRasters = fakeRead();
    await readChannelHistogram([
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
      readChannelHistogram([fakeImage(10, 10)], {
        signal: controller.signal,
      }),
    ).rejects.toThrow();
  });

  it("reads the histogram of a written file", async () => {
    const values = Uint16Array.from({ length: 64 }, (_, i) => i * 100);
    const buffer = writeArrayBuffer(values, {
      width: 8,
      height: 8,
      SamplesPerPixel: [1],
      BitsPerSample: [16],
      PhotometricInterpretation: 1,
    });
    const tiff: GeoTIFF = await fromArrayBuffer(buffer);
    const histogram = await readChannelHistogram([await tiff.getImage(0)]);
    expect(histogram?.range).toEqual([0, 6300]);
    expect(histogram?.hist.reduce((sum, count) => sum + count, 0)).toBe(64);
  });
});
