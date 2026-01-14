import { mat3 } from "gl-matrix";
import { describe, expect, it } from "vitest";

import { type SimilarityTransform } from "../model/types";
import { TransformUtils } from "./TransformUtils";

describe("TransformUtils", () => {
  describe("fromMatrix", () => {
    it("should extract scale, rotation, and translation from a matrix", () => {
      const scale = 2;
      const rotationDeg = 45;
      const translation = { x: 10, y: 20 };
      const m = mat3.create();
      mat3.translate(m, m, [translation.x, translation.y]);
      mat3.rotate(m, m, (Math.PI * rotationDeg) / 180);
      mat3.scale(m, m, [scale, scale]);

      const tf = TransformUtils.fromMatrix(m);

      expect(tf.scale).toBeCloseTo(scale);
      expect(tf.rotation).toBeCloseTo(rotationDeg);
      expect(tf.translation.x).toBeCloseTo(translation.x);
      expect(tf.translation.y).toBeCloseTo(translation.y);
    });

    it("should handle identity matrix", () => {
      const m = mat3.create();
      const tf = TransformUtils.fromMatrix(m);
      expect(tf.scale).toBeCloseTo(1);
      expect(tf.rotation).toBeCloseTo(0);
      expect(tf.translation.x).toBeCloseTo(0);
      expect(tf.translation.y).toBeCloseTo(0);
    });
  });

  describe("toMatrix", () => {
    it("should create a matrix from scale, rotation, and translation", () => {
      const tf: SimilarityTransform = {
        scale: 2,
        rotation: 30,
        translation: { x: 5, y: 7 },
      };
      const m = TransformUtils.toMatrix(tf);

      // Decompose to verify
      const result = TransformUtils.fromMatrix(m);
      expect(result.scale).toBeCloseTo(tf.scale);
      expect(result.rotation).toBeCloseTo(tf.rotation);
      expect(result.translation.x).toBeCloseTo(tf.translation.x);
      expect(result.translation.y).toBeCloseTo(tf.translation.y);
    });

    it("should handle partial transform (only scale)", () => {
      const tf: Partial<SimilarityTransform> = { scale: 3 };
      const m = TransformUtils.toMatrix(tf);
      expect(m[0]).toBeCloseTo(3);
      expect(m[4]).toBeCloseTo(3);
      expect(m[6]).toBeCloseTo(0);
      expect(m[7]).toBeCloseTo(0);
    });

    it("should handle partial transform (only rotation)", () => {
      const tf: Partial<SimilarityTransform> = { rotation: 90 };
      const m = TransformUtils.toMatrix(tf);
      // 90 degree rotation matrix
      expect(m[0]).toBeCloseTo(0);
      expect(m[1]).toBeCloseTo(1);
      expect(m[3]).toBeCloseTo(-1);
      expect(m[4]).toBeCloseTo(0);
    });

    it("should handle partial transform (only translation)", () => {
      const tf: Partial<SimilarityTransform> = { translation: { x: 4, y: 5 } };
      const m = TransformUtils.toMatrix(tf);
      expect(m[6]).toBeCloseTo(4);
      expect(m[7]).toBeCloseTo(5);
    });

    it("should apply rotation around a center", () => {
      const tf: Partial<SimilarityTransform> = { rotation: 90, scale: 1 };
      const m = TransformUtils.toMatrix(tf, { rotationCenter: { x: 2, y: 3 } });
      // After rotating 90 degrees around (2,3), the translation part should not be zero
      expect(m[6]).not.toBe(0);
      expect(m[7]).not.toBe(0);
    });
  });

  describe("asGLMat3x2", () => {
    it("should convert mat3 to mat3x2 format", () => {
      const m = mat3.fromValues(1, 2, 0, 3, 4, 0, 5, 6, 1);
      const mat3x2 = TransformUtils.asGLMat3x2(m);
      expect(mat3x2).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe("transposeAsGLMat2x4", () => {
    it("should transpose mat3 and convert to mat2x4 format", () => {
      const m = mat3.fromValues(1, 2, 0, 3, 4, 0, 5, 6, 1);
      const mat2x4 = TransformUtils.transposeAsGLMat2x4(m);
      expect(mat2x4).toEqual([1, 3, 5, 0, 2, 4, 6, 0]);
    });
  });
});
