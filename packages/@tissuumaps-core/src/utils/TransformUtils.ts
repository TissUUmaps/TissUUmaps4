import { mat3, vec2 } from "gl-matrix";

import type { SimilarityTransform } from "../model/types";
import type { Rect } from "../types";

/**
 * Utility methods for converting between {@link SimilarityTransform}
 * objects and `gl-matrix` {@link mat3} matrices
 */
export class TransformUtils {
  /**
   * Decomposes a 3×3 similarity matrix into a {@link SimilarityTransform}
   *
   * Extracts uniform scale, rotation (in degrees), and translation
   * from a column-major `gl-matrix` {@link mat3}.
   *
   * @param m - The source matrix
   */
  static fromSimilarityMatrix(m: mat3): SimilarityTransform {
    // gl-matrix, like OpenGL, uses column-major order.
    return {
      scale: Math.sqrt(m[0] * m[0] + m[1] * m[1]),
      rotation: (Math.atan2(m[1], m[0]) * 180) / Math.PI,
      translation: { x: m[6], y: m[7] },
    };
  }

  /**
   * Builds a 3×3 similarity matrix from a (partial) {@link SimilarityTransform}
   *
   * Applies, in order: scale, rotation (around `center` if provided),
   * and translation.
   *
   * @param tf - The transform components (all optional)
   * @param options - Optional rotation center in pre-scaled coordinates
   */
  static toSimilarityMatrix(
    tf: Partial<SimilarityTransform>,
    options?: { center?: { x: number; y: number } },
  ): mat3 {
    const { center } = options ?? {};
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    if (tf.translation !== undefined) {
      mat3.translate(m, m, [tf.translation.x, tf.translation.y]);
    }
    if (center !== undefined) {
      mat3.translate(m, m, [
        center.x * (tf.scale ?? 1),
        center.y * (tf.scale ?? 1),
      ]);
    }
    if (tf.rotation !== undefined) {
      mat3.rotate(m, m, (Math.PI * tf.rotation) / 180);
    }
    if (center !== undefined) {
      mat3.translate(m, m, [
        -center.x * (tf.scale ?? 1),
        -center.y * (tf.scale ?? 1),
      ]);
    }
    if (tf.scale !== undefined) {
      mat3.scale(m, m, [tf.scale, tf.scale]);
    }
    return m;
  }

  /**
   * Extracts a column-major `mat3x2` (3 columns × 2 rows) from a {@link mat3},
   * discarding the third row
   *
   * @param m - The source matrix
   */
  static asGLMat3x2(m: mat3): number[] {
    // gl-matrix, like OpenGL, uses column-major order.
    // In OpenGL, mat3x2 has three columns and two rows.
    return [m[0], m[1], m[3], m[4], m[6], m[7]];
  }

  /**
   * Transposes a {@link mat3} and extracts a column-major `mat2x4`
   * (2 columns × 4 rows), zero-padded in the fourth row
   *
   * @param m - The source matrix
   */
  static transposeAsGLMat2x4(m: mat3): number[] {
    // gl-matrix, like OpenGL, uses column-major order.
    // In OpenGL, mat2x4 has two columns and four rows.
    return [m[0], m[3], m[6], 0, m[1], m[4], m[7], 0];
  }

  /**
   * Transforms an axis-aligned rectangle and returns the axis-aligned bounding box of the transformed corners
   *
   * @param rect - The rectangle to transform
   * @param m - The transformation matrix to apply to the rectangle corners
   * @returns The axis-aligned bounding box of the transformed rectangle
   */
  static transformBoundingBox(rect: Rect, m: mat3): Rect {
    const { x, y, width, height } = rect;
    const p0 = vec2.fromValues(x, y);
    const p1 = vec2.fromValues(x + width, y);
    const p2 = vec2.fromValues(x, y + height);
    const p3 = vec2.fromValues(x + width, y + height);
    vec2.transformMat3(p0, p0, m);
    vec2.transformMat3(p1, p1, m);
    vec2.transformMat3(p2, p2, m);
    vec2.transformMat3(p3, p3, m);
    const xMin = Math.min(p0[0], p1[0], p2[0], p3[0]);
    const yMin = Math.min(p0[1], p1[1], p2[1], p3[1]);
    const xMax = Math.max(p0[0], p1[0], p2[0], p3[0]);
    const yMax = Math.max(p0[1], p1[1], p2[1], p3[1]);
    return { x: xMin, y: yMin, width: xMax - xMin, height: yMax - yMin };
  }
}
