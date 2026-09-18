// @vitest-environment jsdom
// OpenSeadragon touches the DOM when imported
import { createCanvas, loadImage } from "canvas";
import { vec2 } from "gl-matrix";
import { describe, expect, it } from "vitest";

import { type SimilarityTransform, identityTransform } from "@tissuumaps/core";

import { WebGLUtils } from "../webgl/WebGLUtils";
import { OpenSeadragonUtils } from "./OpenSeadragonUtils";

const contentSize = { x: 100, y: 80 };

/**
 * Simulates where OpenSeadragon places the four corners of a tiled image,
 * given the geometry computed by
 * {@link OpenSeadragonUtils.getTiledImageTransform}
 *
 * OpenSeadragon renders a tiled image as:
 *   1. Place at (x, y) with the given width (height = width * aspect)
 *   2. If flipped, mirror the tile content horizontally within those bounds
 *   3. Rotate around the center of the un-rotated bounds by `rotation` degrees
 *
 * This mirrors OpenSeadragon 6.1.0, where `TiledImage._getRotationPoint()`
 * returns the center of `getBoundsNoRotate()` and the drawers mirror tiles
 * whose `flipped` property is set, i.e. within the image bounds. Should an
 * OpenSeadragon upgrade change either, this model — and with it
 * {@link OpenSeadragonUtils.getTiledImageTransform} — has to be revisited.
 */
function osdCorners(
  geom: {
    flip: boolean;
    width: number;
    rotation: number;
    position: { x: number; y: number };
  },
  contentSize: { x: number; y: number },
): vec2[] {
  const aspect = contentSize.y / contentSize.x;
  const w = geom.width;
  const h = w * aspect;
  // Corners before rotation, relative to position
  let corners: vec2[] = [
    vec2.fromValues(0, 0),
    vec2.fromValues(w, 0),
    vec2.fromValues(w, h),
    vec2.fromValues(0, h),
  ];
  if (geom.flip) {
    // OpenSeadragon flips around the image center: x' = w - x
    corners = corners.map((c) => vec2.fromValues(w - c[0], c[1]));
  }
  const cx = w / 2;
  const cy = h / 2;
  const rad = (geom.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return corners.map((c) => {
    const dx = c[0] - cx;
    const dy = c[1] - cy;
    return vec2.fromValues(
      geom.position.x + cx + dx * cos - dy * sin,
      geom.position.y + cy + dx * sin + dy * cos,
    );
  });
}

/**
 * Computes where the WebGL renderers place the same four corners, using the
 * data → world matrix they upload to their shaders
 */
function webglCorners(
  objectTransform: SimilarityTransform,
  layerTransform: SimilarityTransform,
  contentSize: { x: number; y: number },
): vec2[] {
  const dataToWorldMatrix = WebGLUtils.createDataToWorldMatrix(
    objectTransform,
    layerTransform,
  );
  const corners = [
    vec2.fromValues(0, 0),
    vec2.fromValues(contentSize.x, 0),
    vec2.fromValues(contentSize.x, contentSize.y),
    vec2.fromValues(0, contentSize.y),
  ];
  return corners.map((c) => {
    const out = vec2.create();
    vec2.transformMat3(out, c, dataToWorldMatrix);
    return out;
  });
}

/**
 * Decodes a single-pixel image data URL into its RGBA bytes
 *
 * Uses the `canvas` package directly, as jsdom does not load images; it is the
 * same library that backs jsdom's canvas, and thus `createPixelUrl`, here.
 */
async function decodePixel(url: string): Promise<number[]> {
  expect(url.startsWith("data:image/png;base64,")).toBe(true);
  const image = await loadImage(url);
  const ctx = createCanvas(1, 1).getContext("2d");
  ctx.drawImage(image, 0, 0);
  return [...ctx.getImageData(0, 0, 1, 1).data];
}

describe("OpenSeadragonUtils", () => {
  describe("createPixelTileSource", () => {
    it("declares a single level holding a single tile of the given size", () => {
      expect(
        OpenSeadragonUtils.createPixelTileSource(
          { width: 300, height: 120 },
          "pixel-url",
        ),
      ).toMatchObject({
        width: 300,
        height: 120,
        tileSize: 300,
        minLevel: 0,
        maxLevel: 0,
      });
    });

    it("sizes the tile to the larger side", () => {
      expect(
        OpenSeadragonUtils.createPixelTileSource(
          { width: 40, height: 90 },
          "pixel-url",
        ),
      ).toMatchObject({ tileSize: 90 });
    });

    it("serves the pixel URL for every tile", () => {
      // TileSourceConfig is an opaque object type, so narrow it to what the
      // pixel tile source is known to provide
      const { getTileUrl } = OpenSeadragonUtils.createPixelTileSource(
        { width: 40, height: 90 },
        "pixel-url",
      ) as { getTileUrl: (level: number, x: number, y: number) => string };
      expect(getTileUrl(0, 0, 0)).toBe("pixel-url");
      expect(getTileUrl(3, 2, 1)).toBe("pixel-url");
    });
  });

  describe("createPixelUrl", () => {
    it("encodes an opaque color", async () => {
      const url = OpenSeadragonUtils.createPixelUrl(12, 200, 255, 1);
      await expect(decodePixel(url)).resolves.toEqual([12, 200, 255, 255]);
    });

    it("encodes a fully transparent pixel", async () => {
      const url = OpenSeadragonUtils.createPixelUrl(12, 200, 255, 0);
      const pixel = await decodePixel(url);
      expect(pixel[3]).toBe(0);
    });

    it("encodes the alpha of a translucent pixel", async () => {
      const url = OpenSeadragonUtils.createPixelUrl(255, 255, 255, 0.5);
      const pixel = await decodePixel(url);
      expect(pixel[3]).toBeGreaterThanOrEqual(127);
      expect(pixel[3]).toBeLessThanOrEqual(128);
    });

    it("provides the transparent and the opaque black pixel", async () => {
      await expect(
        decodePixel(OpenSeadragonUtils.transparentBlackPixelUrl),
      ).resolves.toEqual([0, 0, 0, 0]);
      await expect(
        decodePixel(OpenSeadragonUtils.opaqueBlackPixelUrl),
      ).resolves.toEqual([0, 0, 0, 255]);
    });
  });

  describe("getTiledImageTransform", () => {
    it("returns the content size at the origin for identity transforms", () => {
      const geom = OpenSeadragonUtils.getTiledImageTransform(
        identityTransform,
        identityTransform,
        contentSize,
      );
      expect(geom.flip).toBe(false);
      expect(geom.width).toBeCloseTo(contentSize.x);
      expect(geom.rotation).toBeCloseTo(0);
      expect(geom.position.x).toBeCloseTo(0);
      expect(geom.position.y).toBeCloseTo(0);
    });

    it("applies the object's data → layer scale to the width", () => {
      const geom = OpenSeadragonUtils.getTiledImageTransform(
        { flip: false, scale: 2, rotation: 0, translation: { x: 0, y: 0 } },
        identityTransform,
        contentSize,
      );
      expect(geom.width).toBeCloseTo(200);
      expect(geom.rotation).toBeCloseTo(0);
    });

    it("shifts the position for a flip, which OpenSeadragon applies around the image center", () => {
      const geom = OpenSeadragonUtils.getTiledImageTransform(
        { ...identityTransform, flip: true },
        identityTransform,
        contentSize,
      );
      expect(geom.flip).toBe(true);
      expect(geom.width).toBeCloseTo(100);
      // Position must shift left by the width, as the object is flipped
      // around its left edge but OpenSeadragon flips around the center
      expect(geom.position.x).toBeCloseTo(-100);
      expect(geom.position.y).toBeCloseTo(0);
    });

    it("XORs the layer flip with the object flip", () => {
      const flipped = { ...identityTransform, flip: true };
      const geom = OpenSeadragonUtils.getTiledImageTransform(
        flipped,
        flipped,
        contentSize,
      );
      expect(geom.flip).toBe(false);
    });
  });

  describe("OpenSeadragon/WebGL geometry parity", () => {
    it.each([
      {
        name: "scale + rotation, no flip",
        objectTransform: {
          flip: false,
          scale: 2,
          rotation: 45,
          translation: { x: 10, y: 5 },
        },
        layerTransform: identityTransform,
      },
      {
        name: "flip + rotation",
        objectTransform: {
          flip: true,
          scale: 1,
          rotation: 30,
          translation: { x: 0, y: 0 },
        },
        layerTransform: identityTransform,
      },
      {
        name: "flip + scale + rotation + translation",
        objectTransform: {
          flip: true,
          scale: 2,
          rotation: 60,
          translation: { x: -5, y: 10 },
        },
        layerTransform: identityTransform,
      },
      {
        name: "layer flip + data no-flip",
        objectTransform: {
          flip: false,
          scale: 1.5,
          rotation: 0,
          translation: { x: 3, y: 7 },
        },
        layerTransform: {
          flip: true,
          scale: 1,
          rotation: 0,
          translation: { x: 0, y: 0 },
        },
      },
      {
        name: "both flip + layer rotation",
        objectTransform: {
          flip: true,
          scale: 1,
          rotation: 0,
          translation: { x: 0, y: 0 },
        },
        layerTransform: {
          flip: true,
          scale: 1,
          rotation: 90,
          translation: { x: 0, y: 0 },
        },
      },
      {
        name: "layer scale+rotation + data translation",
        objectTransform: {
          flip: false,
          scale: 1.5,
          rotation: 0,
          translation: { x: 20, y: 10 },
        },
        layerTransform: {
          flip: false,
          scale: 2,
          rotation: 30,
          translation: { x: 5, y: 3 },
        },
      },
      {
        name: "layer scale+rotation + data scale+rotation+translation",
        objectTransform: {
          flip: false,
          scale: 2,
          rotation: 15,
          translation: { x: -5, y: 10 },
        },
        layerTransform: {
          flip: false,
          scale: 3,
          rotation: 45,
          translation: { x: 10, y: -7 },
        },
      },
      {
        name: "flip + layer scale+rotation+translation + data translation",
        objectTransform: {
          flip: true,
          scale: 1.5,
          rotation: 20,
          translation: { x: 8, y: -3 },
        },
        layerTransform: {
          flip: false,
          scale: 2,
          rotation: 60,
          translation: { x: -4, y: 12 },
        },
      },
    ] as {
      name: string;
      objectTransform: SimilarityTransform;
      layerTransform: SimilarityTransform;
    }[])(
      "OpenSeadragon corners match WebGL corners: $name",
      ({ objectTransform, layerTransform }) => {
        const geom = OpenSeadragonUtils.getTiledImageTransform(
          objectTransform,
          layerTransform,
          contentSize,
        );
        const osd = osdCorners(geom, contentSize);
        const webgl = webglCorners(
          objectTransform,
          layerTransform,
          contentSize,
        );
        for (let i = 0; i < 4; i++) {
          expect(osd[i]![0]).toBeCloseTo(webgl[i]![0], 3);
          expect(osd[i]![1]).toBeCloseTo(webgl[i]![1], 3);
        }
      },
    );
  });
});
