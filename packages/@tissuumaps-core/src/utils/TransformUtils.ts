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
   * If `pivot` is given, flip and rotation are expressed about `pivot`
   * (in the input coordinates of `m`) instead of the origin, while scale
   * stays about the origin. Flip, scale, and rotation are unaffected; only
   * the translation changes to `m(pivot) - scale * pivot`, i.e. the position
   * of the scaled content before it is flipped and rotated about its (scaled)
   * pivot. This matches viewers that place an image by its top-left corner
   * and then flip/rotate it about its center.
   *
   * @param m - The source matrix
   * @param pivot - Optional point about which flip and rotation are expressed
   * @returns The decomposed transform
   */
  static fromSimilarityMatrix(
    m: mat3,
    pivot?: { x: number; y: number },
  ): SimilarityTransform {
    // gl-matrix, like OpenGL, uses column-major order.
    const det = m[0] * m[4] - m[3] * m[1];
    const flip = det < 0;
    const c0 = flip ? -m[0] : m[0];
    const c1 = flip ? -m[1] : m[1];
    const scale = Math.hypot(c0, c1);
    const rotation = (Math.atan2(c1, c0) * 180) / Math.PI; // in (-180, 180]
    const translation = { x: m[6], y: m[7] };
    if (pivot !== undefined) {
      const { x: cx, y: cy } = pivot;
      translation.x = m[0] * cx + m[3] * cy + m[6] - scale * cx;
      translation.y = m[1] * cx + m[4] * cy + m[7] - scale * cy;
    }
    return { flip, scale, rotation, translation };
  }

  /**
   * Builds a 3×3 similarity matrix from a (partial) {@link SimilarityTransform}
   *
   * Applies, in order: flip, scale, rotation, and translation.
   *
   * @param tf - The transform components (all optional)
   * @returns The composed matrix
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
