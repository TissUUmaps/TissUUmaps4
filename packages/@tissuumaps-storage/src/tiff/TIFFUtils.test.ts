import type { GeoTIFFImage } from "geotiff";
import { describe, expect, it } from "vitest";

import { TIFFUtils } from "./TIFFUtils";

function fakeImage(
  width: number,
  height: number,
  options?: { samplesPerPixel?: number; photometricInterpretation?: number },
): GeoTIFFImage {
  const { samplesPerPixel = 1, photometricInterpretation = 1 } = options ?? {};
  return {
    getWidth: () => width,
    getHeight: () => height,
    getSamplesPerPixel: () => samplesPerPixel,
    getFileDirectory: () => ({
      getValue: (tag: string) =>
        tag === "PhotometricInterpretation"
          ? photometricInterpretation
          : undefined,
    }),
  } as unknown as GeoTIFFImage;
}

function widths(pyramids: GeoTIFFImage[][]): number[][] {
  return pyramids.map((pyramid) => pyramid.map((image) => image.getWidth()));
}

const rgb = fakeImage(100, 100, {
  samplesPerPixel: 3,
  photometricInterpretation: 2,
});
const ycbcr = fakeImage(100, 100, {
  samplesPerPixel: 3,
  photometricInterpretation: 6,
});
const palette = fakeImage(100, 100, { photometricInterpretation: 3 });
const whiteIsZero = fakeImage(100, 100, { photometricInterpretation: 0 });
const gray = fakeImage(100, 100);

describe("TIFFUtils", () => {
  describe("partitionBySize", () => {
    it("takes the images of the largest width and height as full", () => {
      const images = [
        fakeImage(1000, 800),
        fakeImage(1000, 300), // a label image of the same width
        fakeImage(1000, 800),
        fakeImage(500, 400),
      ];
      const { full, reduced } = TIFFUtils.partitionBySize(images);
      expect(full).toEqual([images[0], images[2]]);
      expect(reduced).toEqual([images[1], images[3]]);
    });
  });

  describe("groupByWidth", () => {
    it("builds one pyramid per plane from groups with one image per plane", () => {
      const planes = [fakeImage(1000, 800), fakeImage(1000, 800)];
      const reduced = [
        fakeImage(250, 200),
        fakeImage(500, 400),
        fakeImage(500, 399), // heights are rounded independently
        fakeImage(250, 200),
        fakeImage(125, 100), // only one image at this width
        fakeImage(600, 200), // a macro image
      ];
      const pyramids = TIFFUtils.groupByWidth(planes, reduced);
      expect(widths(pyramids)).toEqual([
        [1000, 500, 250],
        [1000, 500, 250],
      ]);
      expect(pyramids[0]![1]).toBe(reduced[1]);
      expect(pyramids[1]![1]).toBe(reduced[2]);
    });
  });

  describe("hasOwnColors", () => {
    it("is true for a single RGB, YCbCr, palette or white-is-zero plane", () => {
      expect(TIFFUtils.hasOwnColors([[rgb]])).toBe(true);
      expect(TIFFUtils.hasOwnColors([[ycbcr]])).toBe(true);
      expect(TIFFUtils.hasOwnColors([[palette]])).toBe(true);
      expect(TIFFUtils.hasOwnColors([[whiteIsZero]])).toBe(true);
      expect(TIFFUtils.hasOwnColors([[gray]])).toBe(false);
      expect(TIFFUtils.hasOwnColors([[rgb], [rgb]])).toBe(false);
    });
  });

  describe("validatePyramids", () => {
    it("accepts shrinking grayscale pyramids and images with own colors", () => {
      expect(() =>
        TIFFUtils.validatePyramids([
          [fakeImage(100, 100), fakeImage(50, 50)],
          [fakeImage(100, 100), fakeImage(50, 50)],
        ]),
      ).not.toThrow();
      expect(() => TIFFUtils.validatePyramids([[rgb]])).not.toThrow();
      expect(() => TIFFUtils.validatePyramids([[palette]])).not.toThrow();
    });

    it("rejects an empty file, non-shrinking levels and unsuitable channels", () => {
      expect(() => TIFFUtils.validatePyramids([])).toThrow(/no image/);
      expect(() =>
        TIFFUtils.validatePyramids([
          [fakeImage(100, 100), fakeImage(100, 100)],
        ]),
      ).toThrow(/do not shrink/);
      expect(() => TIFFUtils.validatePyramids([[gray], [rgb]])).toThrow(
        /Channel 1 has 3 samples per pixel/,
      );
      expect(() => TIFFUtils.validatePyramids([[gray], [palette]])).toThrow(
        /palette/,
      );
      expect(() => TIFFUtils.validatePyramids([[gray], [whiteIsZero]])).toThrow(
        /white-is-zero/,
      );
    });
  });

  describe("fillMissingColors", () => {
    it("makes a lone uncolored channel white", () => {
      expect(TIFFUtils.fillMissingColors([{}])).toEqual([
        { color: { r: 255, g: 255, b: 255 } },
      ]);
      const red = { r: 255, g: 0, b: 0 };
      expect(TIFFUtils.fillMissingColors([{ color: red }])).toEqual([
        { color: red },
      ]);
    });

    it("fills the missing colors only if some channel is colored", () => {
      const red = { r: 255, g: 0, b: 0 };
      expect(TIFFUtils.fillMissingColors([{}, {}])).toEqual([{}, {}]);
      const filled = TIFFUtils.fillMissingColors([{ color: red }, {}]);
      expect(filled[0]?.color).toEqual(red);
      expect(filled[1]?.color).toBeDefined();
    });
  });
});
