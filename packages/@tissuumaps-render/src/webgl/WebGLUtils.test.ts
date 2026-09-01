import { mat3, vec2 } from "gl-matrix";
import { describe, expect, it } from "vitest";

import {
  type Layer,
  type Rect,
  type SimilarityTransform,
  createLayer,
  identityTransform,
} from "@tissuumaps/core";

import { WebGLUtils } from "./WebGLUtils";

function createTestLayer(
  transform: SimilarityTransform = identityTransform,
): Layer {
  return createLayer({ id: "l1", name: "Layer 1", transform });
}

function transformPoint(m: mat3, x: number, y: number): [number, number] {
  const out = vec2.create();
  vec2.transformMat3(out, [x, y], m);
  return [out[0], out[1]];
}

function expectPointClose(
  actual: [number, number],
  expected: [number, number],
): void {
  expect(actual[0]).toBeCloseTo(expected[0]);
  expect(actual[1]).toBeCloseTo(expected[1]);
}

describe("WebGLUtils", () => {
  describe("createDataToWorldMatrix", () => {
    it("returns the identity mapping for identity transforms and no flip", () => {
      const dataToWorldMatrix = WebGLUtils.createDataToWorldMatrix(
        identityTransform,
        createTestLayer(),
      );
      expectPointClose(transformPoint(dataToWorldMatrix, 2, 3), [2, 3]);
    });

    it("applies the object's data → layer scale", () => {
      const dataToWorldMatrix = WebGLUtils.createDataToWorldMatrix(
        { flip: false, scale: 2, rotation: 0, translation: { x: 0, y: 0 } },
        createTestLayer(),
      );
      expectPointClose(transformPoint(dataToWorldMatrix, 1, 1), [2, 2]);
    });

    it("applies the object's data → layer translation", () => {
      const dataToWorldMatrix = WebGLUtils.createDataToWorldMatrix(
        { flip: false, scale: 1, rotation: 0, translation: { x: 3, y: 4 } },
        createTestLayer(),
      );
      expectPointClose(transformPoint(dataToWorldMatrix, 2, 3), [5, 7]);
    });

    it("horizontally flips the data coordinates when flip is set", () => {
      const dataToWorldMatrix = WebGLUtils.createDataToWorldMatrix(
        { ...identityTransform, flip: true },
        createTestLayer(),
      );
      expectPointClose(transformPoint(dataToWorldMatrix, 2, 3), [-2, 3]);
    });

    it("applies a 90° rotation counterclockwise", () => {
      const dataToWorldMatrix = WebGLUtils.createDataToWorldMatrix(
        { flip: false, scale: 1, rotation: 90, translation: { x: 0, y: 0 } },
        createTestLayer(),
      );
      expectPointClose(transformPoint(dataToWorldMatrix, 1, 0), [0, 1]);
    });

    it("composes the data → layer and layer → world transforms in order", () => {
      // Object scales by 2, layer translates by (10, 0):
      // data (1, 1) → layer (2, 2) → world (12, 2)
      const dataToWorldMatrix = WebGLUtils.createDataToWorldMatrix(
        { flip: false, scale: 2, rotation: 0, translation: { x: 0, y: 0 } },
        createTestLayer({
          flip: false,
          scale: 1,
          rotation: 0,
          translation: { x: 10, y: 0 },
        }),
      );
      expectPointClose(transformPoint(dataToWorldMatrix, 1, 1), [12, 2]);
    });
  });

  describe("createWorldToDataMatrix", () => {
    it("inverts createDataToWorldMatrix (round trip) for a non-trivial transform", () => {
      const transform = {
        flip: true,
        scale: 2,
        rotation: 30,
        translation: { x: 5, y: -3 },
      };
      const layer = createTestLayer({
        flip: false,
        scale: 1.5,
        rotation: -15,
        translation: { x: -4, y: 8 },
      });
      const dataToWorldMatrix = WebGLUtils.createDataToWorldMatrix(
        transform,
        layer,
      );
      const worldToDataMatrix = WebGLUtils.createWorldToDataMatrix(
        transform,
        layer,
      );

      const worldPoint = transformPoint(dataToWorldMatrix, 7, 11);
      const dataPoint = transformPoint(
        worldToDataMatrix,
        worldPoint[0],
        worldPoint[1],
      );
      expectPointClose(dataPoint, [7, 11]);
    });

    it("undoes the horizontal flip", () => {
      const worldToDataMatrix = WebGLUtils.createWorldToDataMatrix(
        { ...identityTransform, flip: true },
        createTestLayer(),
      );
      expectPointClose(transformPoint(worldToDataMatrix, 2, 3), [-2, 3]);
    });
  });

  describe("createWorldToViewportMatrix", () => {
    const viewport: Rect = { x: 10, y: 20, width: 100, height: 50 };

    it("maps the viewport origin to (0, 0)", () => {
      const worldToViewportMatrix =
        WebGLUtils.createWorldToViewportMatrix(viewport);
      expectPointClose(transformPoint(worldToViewportMatrix, 10, 20), [0, 0]);
    });

    it("maps the far corner to (1, 1)", () => {
      const worldToViewportMatrix =
        WebGLUtils.createWorldToViewportMatrix(viewport);
      expectPointClose(transformPoint(worldToViewportMatrix, 110, 70), [1, 1]);
    });

    it("maps the center to (0.5, 0.5)", () => {
      const worldToViewportMatrix =
        WebGLUtils.createWorldToViewportMatrix(viewport);
      expectPointClose(
        transformPoint(worldToViewportMatrix, 60, 45),
        [0.5, 0.5],
      );
    });
  });

  describe("createViewportToWorldMatrix", () => {
    const viewport: Rect = { x: 10, y: 20, width: 100, height: 50 };

    it("maps (0, 0) to the viewport origin", () => {
      const viewportToWorldMatrix =
        WebGLUtils.createViewportToWorldMatrix(viewport);
      expectPointClose(transformPoint(viewportToWorldMatrix, 0, 0), [10, 20]);
    });

    it("maps (1, 1) to the far corner", () => {
      const viewportToWorldMatrix =
        WebGLUtils.createViewportToWorldMatrix(viewport);
      expectPointClose(transformPoint(viewportToWorldMatrix, 1, 1), [110, 70]);
    });

    it("inverts createWorldToViewportMatrix (round trip)", () => {
      const worldToViewportMatrix =
        WebGLUtils.createWorldToViewportMatrix(viewport);
      const viewportToWorldMatrix =
        WebGLUtils.createViewportToWorldMatrix(viewport);
      const viewportPoint = transformPoint(worldToViewportMatrix, 42, 33);
      const worldPoint = transformPoint(
        viewportToWorldMatrix,
        viewportPoint[0],
        viewportPoint[1],
      );
      expectPointClose(worldPoint, [42, 33]);
    });
  });

  describe("convertMatrixToGLMat3x2", () => {
    it("extracts the first two rows in column-major order, dropping the third", () => {
      // mat3.fromValues stores arguments directly as m[0..8]
      const matrix = mat3.fromValues(0, 1, 2, 3, 4, 5, 6, 7, 8);
      expect(WebGLUtils.convertMatrixToGLMat3x2(matrix)).toEqual([
        0, 1, 3, 4, 6, 7,
      ]);
    });
  });

  describe("transposeAndConvertMatrixToGLMat2x4", () => {
    it("transposes and extracts a column-major mat2x4 zero-padded in the fourth row", () => {
      const matrix = mat3.fromValues(0, 1, 2, 3, 4, 5, 6, 7, 8);
      expect(WebGLUtils.transposeAndConvertMatrixToGLMat2x4(matrix)).toEqual([
        0, 3, 6, 0, 1, 4, 7, 0,
      ]);
    });
  });
});
