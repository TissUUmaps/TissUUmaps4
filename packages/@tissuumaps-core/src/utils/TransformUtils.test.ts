import { mat3, vec2 } from "gl-matrix";
import { describe, expect, it } from "vitest";

import type { SimilarityTransform } from "../model/primitives";
import { TransformUtils } from "./TransformUtils";

describe("TransformUtils", () => {
  describe("fromSimilarityMatrix", () => {
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

    it("detects flip from negative determinant", () => {
      const m = mat3.create();
      mat3.scale(m, m, [-1, 1]);
      const tf = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.flip).toBe(true);
      expect(tf.scale).toBeCloseTo(1);
      expect(tf.rotation).toBeCloseTo(0);
    });

    it("detects flip with scale and rotation", () => {
      const m = mat3.create();
      mat3.translate(m, m, [5, 7]);
      mat3.rotate(m, m, (Math.PI * 30) / 180);
      mat3.scale(m, m, [2, 2]);
      mat3.scale(m, m, [-1, 1]);
      const tf = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.flip).toBe(true);
      expect(tf.scale).toBeCloseTo(2);
      expect(tf.rotation).toBeCloseTo(30);
      expect(tf.translation.x).toBeCloseTo(5);
      expect(tf.translation.y).toBeCloseTo(7);
    });

    it("returns flip: false for non-flipped matrix", () => {
      const m = mat3.create();
      mat3.rotate(m, m, Math.PI / 4);
      mat3.scale(m, m, [3, 3]);
      const tf = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.flip).toBe(false);
    });
  });

  describe("fromSimilarityMatrix with pivot", () => {
    const pivot = { x: 50, y: 25 };

    it("matches the pivot-free result for a pivot at the origin", () => {
      const m = mat3.create();
      mat3.translate(m, m, [5, 7]);
      mat3.rotate(m, m, Math.PI / 6);
      mat3.scale(m, m, [2, 2]);
      mat3.scale(m, m, [-1, 1]);
      const tf = TransformUtils.fromSimilarityMatrix(m, { x: 0, y: 0 });
      const ref = TransformUtils.fromSimilarityMatrix(m);
      expect(tf).toEqual(ref);
    });

    it("leaves the identity matrix untouched", () => {
      const tf = TransformUtils.fromSimilarityMatrix(mat3.create(), pivot);
      expect(tf.flip).toBe(false);
      expect(tf.scale).toBeCloseTo(1);
      expect(tf.rotation).toBeCloseTo(0);
      expect(tf.translation.x).toBeCloseTo(0);
      expect(tf.translation.y).toBeCloseTo(0);
    });

    it("does not pivot scale", () => {
      const m = mat3.create();
      mat3.translate(m, m, [5, 7]);
      mat3.scale(m, m, [3, 3]);
      const tf = TransformUtils.fromSimilarityMatrix(m, pivot);
      expect(tf.scale).toBeCloseTo(3);
      expect(tf.translation.x).toBeCloseTo(5);
      expect(tf.translation.y).toBeCloseTo(7);
    });

    it("shifts a flip about the origin to a flip about the pivot", () => {
      const m = mat3.create();
      mat3.scale(m, m, [-1, 1]);
      const tf = TransformUtils.fromSimilarityMatrix(m, pivot);
      expect(tf.flip).toBe(true);
      // Flipping about x = 0 equals flipping about x = pivot.x, then
      // translating by -2 * pivot.x
      expect(tf.translation.x).toBeCloseTo(-2 * pivot.x);
      expect(tf.translation.y).toBeCloseTo(0);
    });

    it("shifts a rotation about the origin to a rotation about the pivot", () => {
      const m = mat3.create();
      mat3.rotate(m, m, Math.PI / 2);
      const tf = TransformUtils.fromSimilarityMatrix(m, pivot);
      expect(tf.rotation).toBeCloseTo(90);
      // A 90° rotation maps the pivot (x, y) to (-y, x); the translation is
      // that image minus the (unscaled) pivot
      expect(tf.translation.x).toBeCloseTo(-pivot.y - pivot.x);
      expect(tf.translation.y).toBeCloseTo(pivot.x - pivot.y);
    });

    it("keeps flip, scale, and rotation", () => {
      const m = mat3.create();
      mat3.translate(m, m, [5, 7]);
      mat3.rotate(m, m, Math.PI / 6);
      mat3.scale(m, m, [2, 2]);
      mat3.scale(m, m, [-1, 1]);
      const tf = TransformUtils.fromSimilarityMatrix(m, pivot);
      const ref = TransformUtils.fromSimilarityMatrix(m);
      expect(tf.flip).toBe(ref.flip);
      expect(tf.scale).toBeCloseTo(ref.scale);
      expect(tf.rotation).toBeCloseTo(ref.rotation);
    });

    it("places the pivot where the matrix maps it", () => {
      const m = mat3.create();
      mat3.translate(m, m, [5, 7]);
      mat3.rotate(m, m, Math.PI / 4);
      mat3.scale(m, m, [2, 2]);
      mat3.scale(m, m, [-1, 1]);
      const tf = TransformUtils.fromSimilarityMatrix(m, pivot);
      const mapped = vec2.transformMat3(vec2.create(), [pivot.x, pivot.y], m);
      // Flip and rotation fix the scaled pivot, so the mapped pivot is the
      // translation plus the scaled pivot
      expect(tf.translation.x + tf.scale * pivot.x).toBeCloseTo(mapped[0]);
      expect(tf.translation.y + tf.scale * pivot.y).toBeCloseTo(mapped[1]);
    });
  });

  describe("toSimilarityMatrix", () => {
    it("creates a matrix from scale, rotation, and translation", () => {
      const tf: SimilarityTransform = {
        flip: false,
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

    it("creates a flipped matrix", () => {
      const tf: SimilarityTransform = {
        flip: true,
        scale: 2,
        rotation: 30,
        translation: { x: 5, y: 7 },
      };
      const m = TransformUtils.toSimilarityMatrix(tf);
      const det = m[0] * m[4] - m[3] * m[1];
      expect(det).toBeLessThan(0);
      const result = TransformUtils.fromSimilarityMatrix(m);
      expect(result.flip).toBe(true);
      expect(result.scale).toBeCloseTo(tf.scale);
      expect(result.rotation).toBeCloseTo(tf.rotation);
      expect(result.translation.x).toBeCloseTo(tf.translation.x);
      expect(result.translation.y).toBeCloseTo(tf.translation.y);
    });

    it("returns identity for empty partial transform", () => {
      const m = TransformUtils.toSimilarityMatrix({});
      const identity = mat3.create();
      for (let i = 0; i < 9; i++) {
        expect(m[i]).toBeCloseTo(identity[i]!);
      }
    });
  });

  describe("toSimilarityMatrix with pivot", () => {
    const pivot = { x: 50, y: 25 };

    it("matches the pivot-free result for a pivot at the origin", () => {
      const tf: SimilarityTransform = {
        flip: true,
        scale: 2,
        rotation: 30,
        translation: { x: 5, y: 7 },
      };
      const m = TransformUtils.toSimilarityMatrix(tf, { x: 0, y: 0 });
      const ref = TransformUtils.toSimilarityMatrix(tf);
      for (let i = 0; i < 9; i++) {
        expect(m[i]).toBeCloseTo(ref[i]!);
      }
    });

    it("returns identity for an empty partial transform", () => {
      const m = TransformUtils.toSimilarityMatrix({}, pivot);
      const identity = mat3.create();
      for (let i = 0; i < 9; i++) {
        expect(m[i]).toBeCloseTo(identity[i]!);
      }
    });

    it("flips about the pivot", () => {
      const m = TransformUtils.toSimilarityMatrix({ flip: true }, pivot);
      const q = vec2.transformMat3(vec2.create(), [10, 20], m);
      expect(q[0]).toBeCloseTo(2 * pivot.x - 10);
      expect(q[1]).toBeCloseTo(20);
    });

    it("rotates about the pivot", () => {
      const m = TransformUtils.toSimilarityMatrix({ rotation: 90 }, pivot);
      const fixed = vec2.transformMat3(vec2.create(), [pivot.x, pivot.y], m);
      expect(fixed[0]).toBeCloseTo(pivot.x);
      expect(fixed[1]).toBeCloseTo(pivot.y);
      // (pivot.x + 1, pivot.y) rotates by 90° about the pivot to (pivot.x, pivot.y + 1)
      const q = vec2.transformMat3(vec2.create(), [pivot.x + 1, pivot.y], m);
      expect(q[0]).toBeCloseTo(pivot.x);
      expect(q[1]).toBeCloseTo(pivot.y + 1);
    });

    it("scales about the origin and rotates about the scaled pivot", () => {
      const m = TransformUtils.toSimilarityMatrix(
        { scale: 2, rotation: 90 },
        pivot,
      );
      // Scale is not pivoted, so the pivot lands at scale * pivot
      const q = vec2.transformMat3(vec2.create(), [pivot.x, pivot.y], m);
      expect(q[0]).toBeCloseTo(2 * pivot.x);
      expect(q[1]).toBeCloseTo(2 * pivot.y);
    });
  });

  describe("fromSimilarityMatrix / toSimilarityMatrix roundtrip", () => {
    it.each([
      { flip: false, scale: 1, rotation: 0, translation: { x: 0, y: 0 } },
      {
        flip: false,
        scale: 2.5,
        rotation: 60,
        translation: { x: -10, y: 20 },
      },
      {
        flip: false,
        scale: 0.5,
        rotation: -45,
        translation: { x: 100, y: 100 },
      },
      { flip: true, scale: 1, rotation: 0, translation: { x: 0, y: 0 } },
      {
        flip: true,
        scale: 2.5,
        rotation: 60,
        translation: { x: -10, y: 20 },
      },
      {
        flip: true,
        scale: 0.5,
        rotation: -45,
        translation: { x: 100, y: 100 },
      },
    ])("roundtrips %j", (tf) => {
      const m = TransformUtils.toSimilarityMatrix(tf);
      const result = TransformUtils.fromSimilarityMatrix(m);
      expect(result.flip).toBe(tf.flip);
      expect(result.scale).toBeCloseTo(tf.scale);
      expect(result.rotation).toBeCloseTo(tf.rotation);
      expect(result.translation.x).toBeCloseTo(tf.translation.x);
      expect(result.translation.y).toBeCloseTo(tf.translation.y);
    });
  });

  describe("fromSimilarityMatrix / toSimilarityMatrix roundtrip with pivot", () => {
    const pivot = { x: 50, y: 25 };

    it.each([
      { flip: false, scale: 1, rotation: 0, translation: { x: 0, y: 0 } },
      {
        flip: false,
        scale: 2.5,
        rotation: 60,
        translation: { x: -10, y: 20 },
      },
      {
        flip: false,
        scale: 0.5,
        rotation: -45,
        translation: { x: 100, y: 100 },
      },
      { flip: true, scale: 1, rotation: 0, translation: { x: 0, y: 0 } },
      {
        flip: true,
        scale: 2.5,
        rotation: 60,
        translation: { x: -10, y: 20 },
      },
      {
        flip: true,
        scale: 0.5,
        rotation: -45,
        translation: { x: 100, y: 100 },
      },
    ])("roundtrips %j through the matrix", (tf) => {
      const m = TransformUtils.toSimilarityMatrix(tf, pivot);
      const result = TransformUtils.fromSimilarityMatrix(m, pivot);
      expect(result.flip).toBe(tf.flip);
      expect(result.scale).toBeCloseTo(tf.scale);
      expect(result.rotation).toBeCloseTo(tf.rotation);
      expect(result.translation.x).toBeCloseTo(tf.translation.x);
      expect(result.translation.y).toBeCloseTo(tf.translation.y);
    });

    it.each([
      { flip: false, scale: 1, rotation: 0, translation: { x: 0, y: 0 } },
      {
        flip: false,
        scale: 2.5,
        rotation: 60,
        translation: { x: -10, y: 20 },
      },
      {
        flip: true,
        scale: 0.5,
        rotation: -45,
        translation: { x: 100, y: 100 },
      },
    ])(
      "roundtrips the origin-pivoted matrix of %j through the transform",
      (tf) => {
        const m = TransformUtils.toSimilarityMatrix(tf);
        const rebuilt = TransformUtils.toSimilarityMatrix(
          TransformUtils.fromSimilarityMatrix(m, pivot),
          pivot,
        );
        for (let i = 0; i < 9; i++) {
          expect(rebuilt[i]).toBeCloseTo(m[i]!);
        }
      },
    );
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
