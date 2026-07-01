import { mat3 } from "gl-matrix";
import { describe, expect, it } from "vitest";

import type { SimilarityTransform } from "../model/types";
import { TransformUtils } from "./TransformUtils";

describe("TransformUtils", () => {
  describe("fromMatrix", () => {
    it("extracts scale, rotation, and translation from a matrix", () => {
      const scale = 2;
      const rotationDeg = 45;
      const translation = { x: 10, y: 20 };
      const m = mat3.create();
      mat3.translate(m, m, [translation.x, translation.y]);
      mat3.rotate(m, m, (Math.PI * rotationDeg) / 180);
      mat3.scale(m, m, [scale, scale]);

      const tf = TransformUtils.fromSimilarityMatrix(m);

      expect(tf.scale).toBeCloseTo(scale);
      expect(tf.rotation).toBeCloseTo(rotationDeg);
      expect(tf.translation.x).toBeCloseTo(translation.x);
      expect(tf.translation.y).toBeCloseTo(translation.y);
    });

    it("handles identity matrix", () => {
      const m = mat3.create();
      const tf = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.scale).toBeCloseTo(1);
      expect(tf.rotation).toBeCloseTo(0);
      expect(tf.translation.x).toBeCloseTo(0);
      expect(tf.translation.y).toBeCloseTo(0);
    });

    it("extracts pure translation", () => {
      const m = mat3.create();
      mat3.translate(m, m, [7, -3]);
      const tf = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.scale).toBeCloseTo(1);
      expect(tf.rotation).toBeCloseTo(0);
      expect(tf.translation.x).toBeCloseTo(7);
      expect(tf.translation.y).toBeCloseTo(-3);
    });

    it("extracts pure scale", () => {
      const m = mat3.create();
      mat3.scale(m, m, [4, 4]);
      const tf = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.scale).toBeCloseTo(4);
      expect(tf.rotation).toBeCloseTo(0);
      expect(tf.translation.x).toBeCloseTo(0);
      expect(tf.translation.y).toBeCloseTo(0);
    });
  });

  describe("toMatrix", () => {
    it("creates a matrix from scale, rotation, and translation", () => {
      const tf: SimilarityTransform = {
        scale: 2,
        rotation: 30,
        translation: { x: 5, y: 7 },
      };
      const m = TransformUtils.toSimilarityMatrix(tf);

      const result = TransformUtils.fromSimilarityMatrix(m);
      expect(result.scale).toBeCloseTo(tf.scale);
      expect(result.rotation).toBeCloseTo(tf.rotation);
      expect(result.translation.x).toBeCloseTo(tf.translation.x);
      expect(result.translation.y).toBeCloseTo(tf.translation.y);
    });

    it("handles partial transform (only scale)", () => {
      const m = TransformUtils.toSimilarityMatrix({ scale: 3 });
      expect(m[0]).toBeCloseTo(3);
      expect(m[4]).toBeCloseTo(3);
      expect(m[6]).toBeCloseTo(0);
      expect(m[7]).toBeCloseTo(0);
    });

    it("handles partial transform (only rotation)", () => {
      const m = TransformUtils.toSimilarityMatrix({ rotation: 90 });
      expect(m[0]).toBeCloseTo(0);
      expect(m[1]).toBeCloseTo(1);
      expect(m[3]).toBeCloseTo(-1);
      expect(m[4]).toBeCloseTo(0);
    });

    it("handles partial transform (only translation)", () => {
      const m = TransformUtils.toSimilarityMatrix({
        translation: { x: 4, y: 5 },
      });
      expect(m[6]).toBeCloseTo(4);
      expect(m[7]).toBeCloseTo(5);
    });

    it("applies rotation around a center", () => {
      const center = { x: 2, y: 3 };
      const m = TransformUtils.toSimilarityMatrix(
        { rotation: 90, scale: 1 },
        { center },
      );
      const tf = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.rotation).toBeCloseTo(90);
      expect(tf.scale).toBeCloseTo(1);
      // The origin maps to (m[6], m[7]) which should be (5, 1)
      expect(m[6]).toBeCloseTo(5);
      expect(m[7]).toBeCloseTo(1);
    });

    it("applies rotation around a center without explicit scale (defaults to 1)", () => {
      const center = { x: 2, y: 3 };
      const withDefault = TransformUtils.toSimilarityMatrix(
        { rotation: 90 },
        { center },
      );
      const withExplicit = TransformUtils.toSimilarityMatrix(
        { rotation: 90, scale: 1 },
        { center },
      );
      // Omitting scale should behave identically to scale: 1
      for (let i = 0; i < 9; i++) {
        expect(withDefault[i]).toBeCloseTo(withExplicit[i]!);
      }
    });

    it("applies rotation around a center with scale", () => {
      const center = { x: 1, y: 1 };
      const m = TransformUtils.toSimilarityMatrix(
        { rotation: 180, scale: 2 },
        { center },
      );
      const tf = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.rotation).toBeCloseTo(180);
      expect(tf.scale).toBeCloseTo(2);
      // At 180° rotation around scaled center (2,2): translation = (4,4)
      expect(m[6]).toBeCloseTo(4);
      expect(m[7]).toBeCloseTo(4);
    });

    it("returns identity for empty partial transform", () => {
      const m = TransformUtils.toSimilarityMatrix({});
      const identity = mat3.create();
      for (let i = 0; i < 9; i++) {
        expect(m[i]).toBeCloseTo(identity[i]!);
      }
    });
  });

  describe("fromMatrix / toMatrix roundtrip", () => {
    it.each([
      { scale: 1, rotation: 0, translation: { x: 0, y: 0 } },
      { scale: 2.5, rotation: 60, translation: { x: -10, y: 20 } },
      { scale: 0.5, rotation: -45, translation: { x: 100, y: 100 } },
    ])("roundtrips %j", (tf) => {
      const m = TransformUtils.toSimilarityMatrix(tf);
      const result = TransformUtils.fromSimilarityMatrix(m);
      expect(result.scale).toBeCloseTo(tf.scale);
      expect(result.rotation).toBeCloseTo(tf.rotation);
      expect(result.translation.x).toBeCloseTo(tf.translation.x);
      expect(result.translation.y).toBeCloseTo(tf.translation.y);
    });
  });

  describe("asGLMat3x2", () => {
    it("converts mat3 to mat3x2 format", () => {
      const m = mat3.fromValues(1, 2, 0, 3, 4, 0, 5, 6, 1);
      const mat3x2 = TransformUtils.asGLMat3x2(m);
      expect(mat3x2).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it("returns [1,0,0,1,0,0] for identity", () => {
      const m = mat3.create();
      expect(TransformUtils.asGLMat3x2(m)).toEqual([1, 0, 0, 1, 0, 0]);
    });
  });

  describe("transposeAsGLMat2x4", () => {
    it("transposes mat3 and converts to mat2x4 format", () => {
      const m = mat3.fromValues(1, 2, 0, 3, 4, 0, 5, 6, 1);
      const mat2x4 = TransformUtils.transposeAsGLMat2x4(m);
      expect(mat2x4).toEqual([1, 3, 5, 0, 2, 4, 6, 0]);
    });

    it("returns [1,0,0,0,0,1,0,0] for identity", () => {
      const m = mat3.create();
      expect(TransformUtils.transposeAsGLMat2x4(m)).toEqual([
        1, 0, 0, 0, 0, 1, 0, 0,
      ]);
    });
  });

  describe("transformBoundingBox", () => {
    it("returns the same rect for identity transform", () => {
      const rect = { x: 10, y: 20, width: 30, height: 40 };
      const result = TransformUtils.transformBoundingBox(rect, mat3.create());
      expect(result.x).toBeCloseTo(10);
      expect(result.y).toBeCloseTo(20);
      expect(result.width).toBeCloseTo(30);
      expect(result.height).toBeCloseTo(40);
    });

    it("applies translation", () => {
      const rect = { x: 0, y: 0, width: 10, height: 10 };
      const m = mat3.create();
      mat3.translate(m, m, [5, -3]);
      const result = TransformUtils.transformBoundingBox(rect, m);
      expect(result.x).toBeCloseTo(5);
      expect(result.y).toBeCloseTo(-3);
      expect(result.width).toBeCloseTo(10);
      expect(result.height).toBeCloseTo(10);
    });

    it("applies uniform scale", () => {
      const rect = { x: 1, y: 2, width: 3, height: 4 };
      const m = mat3.create();
      mat3.scale(m, m, [2, 2]);
      const result = TransformUtils.transformBoundingBox(rect, m);
      expect(result.x).toBeCloseTo(2);
      expect(result.y).toBeCloseTo(4);
      expect(result.width).toBeCloseTo(6);
      expect(result.height).toBeCloseTo(8);
    });

    it("expands bounding box for 45° rotation", () => {
      const rect = { x: 0, y: 0, width: 10, height: 10 };
      const m = mat3.create();
      mat3.rotate(m, m, Math.PI / 4);
      const result = TransformUtils.transformBoundingBox(rect, m);
      const d = 10 * Math.SQRT2;
      expect(result.x).toBeCloseTo(-10 * Math.sin(Math.PI / 4));
      expect(result.y).toBeCloseTo(0);
      expect(result.width).toBeCloseTo(d);
      expect(result.height).toBeCloseTo(d);
    });

    it("swaps width and height for 90° rotation", () => {
      const rect = { x: 0, y: 0, width: 6, height: 4 };
      const m = mat3.create();
      mat3.rotate(m, m, Math.PI / 2);
      const result = TransformUtils.transformBoundingBox(rect, m);
      expect(result.width).toBeCloseTo(4);
      expect(result.height).toBeCloseTo(6);
    });

    it("handles a zero-size rect", () => {
      const rect = { x: 5, y: 5, width: 0, height: 0 };
      const m = mat3.create();
      mat3.translate(m, m, [1, 1]);
      const result = TransformUtils.transformBoundingBox(rect, m);
      expect(result.x).toBeCloseTo(6);
      expect(result.y).toBeCloseTo(6);
      expect(result.width).toBeCloseTo(0);
      expect(result.height).toBeCloseTo(0);
    });

    it("handles combined scale, rotation, and translation", () => {
      const rect = { x: 0, y: 0, width: 2, height: 2 };
      const m = mat3.create();
      mat3.translate(m, m, [10, 10]);
      mat3.rotate(m, m, Math.PI / 2);
      mat3.scale(m, m, [3, 3]);
      const result = TransformUtils.transformBoundingBox(rect, m);
      // Corners after transform: (10,10), (10,16), (4,10), (4,16)
      expect(result.x).toBeCloseTo(4);
      expect(result.y).toBeCloseTo(10);
      expect(result.width).toBeCloseTo(6);
      expect(result.height).toBeCloseTo(6);
    });
  });
});
