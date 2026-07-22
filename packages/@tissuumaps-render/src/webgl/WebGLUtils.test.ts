import { mat3, vec2 } from "gl-matrix";
import { describe, expect, it } from "vitest";

import {
  type Layer,
  type Rect,
  type SimilarityTransform,
  createLayer,
} from "@tissuumaps/core";

import { WebGLUtils } from "./WebGLUtils";

const identity: SimilarityTransform = {
  scale: 1,
  rotation: 0,
  translation: { x: 0, y: 0 },
};

function makeLayer(transform: SimilarityTransform = identity): Layer {
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
      const m = WebGLUtils.createDataToWorldMatrix(
        { flip: false, transform: identity },
        makeLayer(),
      );
      expectPointClose(transformPoint(m, 2, 3), [2, 3]);
    });

    it("applies the object's data → layer scale", () => {
      const m = WebGLUtils.createDataToWorldMatrix(
        {
          flip: false,
          transform: { scale: 2, rotation: 0, translation: { x: 0, y: 0 } },
        },
        makeLayer(),
      );
      expectPointClose(transformPoint(m, 1, 1), [2, 2]);
    });

    it("applies the object's data → layer translation", () => {
      const m = WebGLUtils.createDataToWorldMatrix(
        {
          flip: false,
          transform: { scale: 1, rotation: 0, translation: { x: 3, y: 4 } },
        },
        makeLayer(),
      );
      expectPointClose(transformPoint(m, 2, 3), [5, 7]);
    });

    it("horizontally flips the data coordinates when flip is set", () => {
      const m = WebGLUtils.createDataToWorldMatrix(
        { flip: true, transform: identity },
        makeLayer(),
      );
      expectPointClose(transformPoint(m, 2, 3), [-2, 3]);
    });

    it("applies a 90° rotation counterclockwise", () => {
      const m = WebGLUtils.createDataToWorldMatrix(
        {
          flip: false,
          transform: { scale: 1, rotation: 90, translation: { x: 0, y: 0 } },
        },
        makeLayer(),
      );
      expectPointClose(transformPoint(m, 1, 0), [0, 1]);
    });

    it("composes the data → layer and layer → world transforms in order", () => {
      // Object scales by 2, layer translates by (10, 0):
      // data (1, 1) → layer (2, 2) → world (12, 2)
      const m = WebGLUtils.createDataToWorldMatrix(
        {
          flip: false,
          transform: { scale: 2, rotation: 0, translation: { x: 0, y: 0 } },
        },
        makeLayer({ scale: 1, rotation: 0, translation: { x: 10, y: 0 } }),
      );
      expectPointClose(transformPoint(m, 1, 1), [12, 2]);
    });
  });

  describe("createWorldToDataMatrix", () => {
    it("inverts createDataToWorldMatrix (round trip) for a non-trivial transform", () => {
      const obj = {
        flip: true,
        transform: { scale: 2, rotation: 30, translation: { x: 5, y: -3 } },
      };
      const layer = makeLayer({
        scale: 1.5,
        rotation: -15,
        translation: { x: -4, y: 8 },
      });
      const dataToWorld = WebGLUtils.createDataToWorldMatrix(obj, layer);
      const worldToData = WebGLUtils.createWorldToDataMatrix(obj, layer);

      const world = transformPoint(dataToWorld, 7, 11);
      const backToData = transformPoint(worldToData, world[0], world[1]);
      expectPointClose(backToData, [7, 11]);
    });

    it("undoes the horizontal flip", () => {
      const m = WebGLUtils.createWorldToDataMatrix(
        { flip: true, transform: identity },
        makeLayer(),
      );
      expectPointClose(transformPoint(m, 2, 3), [-2, 3]);
    });
  });

  describe("createWorldToViewportMatrix", () => {
    const viewport: Rect = { x: 10, y: 20, width: 100, height: 50 };

    it("maps the viewport origin to (0, 0)", () => {
      const m = WebGLUtils.createWorldToViewportMatrix(viewport);
      expectPointClose(transformPoint(m, 10, 20), [0, 0]);
    });

    it("maps the far corner to (1, 1)", () => {
      const m = WebGLUtils.createWorldToViewportMatrix(viewport);
      expectPointClose(transformPoint(m, 110, 70), [1, 1]);
    });

    it("maps the center to (0.5, 0.5)", () => {
      const m = WebGLUtils.createWorldToViewportMatrix(viewport);
      expectPointClose(transformPoint(m, 60, 45), [0.5, 0.5]);
    });
  });

  describe("createViewportToWorldMatrix", () => {
    const viewport: Rect = { x: 10, y: 20, width: 100, height: 50 };

    it("maps (0, 0) to the viewport origin", () => {
      const m = WebGLUtils.createViewportToWorldMatrix(viewport);
      expectPointClose(transformPoint(m, 0, 0), [10, 20]);
    });

    it("maps (1, 1) to the far corner", () => {
      const m = WebGLUtils.createViewportToWorldMatrix(viewport);
      expectPointClose(transformPoint(m, 1, 1), [110, 70]);
    });

    it("inverts createWorldToViewportMatrix (round trip)", () => {
      const worldToViewport = WebGLUtils.createWorldToViewportMatrix(viewport);
      const viewportToWorld = WebGLUtils.createViewportToWorldMatrix(viewport);
      const viewportPoint = transformPoint(worldToViewport, 42, 33);
      const back = transformPoint(
        viewportToWorld,
        viewportPoint[0],
        viewportPoint[1],
      );
      expectPointClose(back, [42, 33]);
    });
  });

  describe("convertMatrixToGLMat3x2", () => {
    it("extracts the first two rows in column-major order, dropping the third", () => {
      // mat3.fromValues stores arguments directly as m[0..8]
      const m = mat3.fromValues(0, 1, 2, 3, 4, 5, 6, 7, 8);
      expect(WebGLUtils.convertMatrixToGLMat3x2(m)).toEqual([0, 1, 3, 4, 6, 7]);
    });
  });

  describe("transposeAndConvertMatrixToGLMat2x4", () => {
    it("transposes and extracts a column-major mat2x4 zero-padded in the fourth row", () => {
      const m = mat3.fromValues(0, 1, 2, 3, 4, 5, 6, 7, 8);
      expect(WebGLUtils.transposeAndConvertMatrixToGLMat2x4(m)).toEqual([
        0, 3, 6, 0, 1, 4, 7, 0,
      ]);
    });
  });
});
