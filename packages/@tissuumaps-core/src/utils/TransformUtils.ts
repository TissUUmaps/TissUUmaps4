import { mat3, vec2 } from "gl-matrix";

import type { SimilarityTransform } from "../model/primitives";
import type { Rect } from "../types/geometry";

/**
 * Utility methods for converting between {@link SimilarityTransform}
 * objects and `gl-matrix` {@link mat3} matrices
 */
export class TransformUtils {
  /**
   * Decomposes a 3×3 similarity matrix into a {@link SimilarityTransform}
   *
   * Extracts flip, uniform scale, rotation (in degrees), and translation
   * from a column-major `gl-matrix` {@link mat3}. A negative 2D determinant
   * indicates a horizontal reflection.
   *
   * When `center` is provided the returned translation is adjusted so that
   * flip and rotation are expressed around that center instead of the origin.
   *
   * @param m - The source matrix
   * @param options - Optional center in pre-scaled coordinates
   */
  static fromSimilarityMatrix(
    m: mat3,
    options?: { center?: { x: number; y: number } },
  ): SimilarityTransform {
    // gl-matrix, like OpenGL, uses column-major order.
    // Detect reflection via the sign of the 2D determinant.
    const det = m[0] * m[4] - m[3] * m[1];
    const flip = det < 0;
    const c0 = flip ? -m[0] : m[0];
    const c1 = flip ? -m[1] : m[1];
    const scale = Math.sqrt(c0 * c0 + c1 * c1);
    const rotation = (Math.atan2(c1, c0) * 180) / Math.PI;
    let tx = m[6];
    let ty = m[7];
    const { center } = options ?? {};
    if (center !== undefined) {
      const cx = center.x * scale;
      const cy = center.y * scale;
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      tx -= cy * sin + cx * (1 - cos);
      ty -= cy * (1 - cos) - cx * sin;
      if (flip) {
        tx -= 2 * cx * cos;
        ty -= 2 * cx * sin;
      }
    }
    return {
      flip,
      scale,
      rotation,
      translation: { x: tx, y: ty },
    };
  }

  /**
   * Builds a 3×3 similarity matrix from a (partial) {@link SimilarityTransform}
   *
   * Applies, in order: flip, scale, rotation, and translation.
   *
   * @param tf - The transform components (all optional)
   */
  static toSimilarityMatrix(tf: Partial<SimilarityTransform>): mat3 {
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    if (tf.translation !== undefined) {
      mat3.translate(m, m, [tf.translation.x, tf.translation.y]);
    }
    if (tf.rotation !== undefined) {
      mat3.rotate(m, m, (Math.PI * tf.rotation) / 180);
    }
    if (tf.scale !== undefined) {
      mat3.scale(m, m, [tf.scale, tf.scale]);
    }
    if (tf.flip) {
      mat3.scale(m, m, [-1, 1]);
    }
    return m;
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
