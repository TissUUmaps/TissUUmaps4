import { mat3 } from "gl-matrix";

import { type SimilarityTransform } from "../model/types";

export class TransformUtils {
  static fromMatrix(m: mat3): SimilarityTransform {
    // gl-matrix, like OpenGL, uses column-major order.
    return {
      scale: Math.sqrt(m[0] * m[0] + m[1] * m[1]),
      rotation: (Math.atan2(m[1], m[0]) * 180) / Math.PI,
      translation: { x: m[6], y: m[7] },
    };
  }

  static toMatrix(
    tf: Partial<SimilarityTransform>,
    {
      rotationCenter,
    }: {
      rotationCenter?: { x: number; y: number };
    } = {},
  ): mat3 {
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    if (tf.translation !== undefined) {
      mat3.translate(m, m, [tf.translation.x, tf.translation.y]);
    }
    if (rotationCenter !== undefined) {
      mat3.translate(m, m, [
        rotationCenter.x * (tf.scale ?? 1),
        rotationCenter.y * (tf.scale ?? 1),
      ]);
    }
    if (tf.rotation !== undefined) {
      mat3.rotate(m, m, (Math.PI * tf.rotation) / 180);
    }
    if (rotationCenter !== undefined) {
      mat3.translate(m, m, [
        -rotationCenter.x * (tf.scale ?? 1),
        -rotationCenter.y * (tf.scale ?? 1),
      ]);
    }
    if (tf.scale !== undefined) {
      mat3.scale(m, m, [tf.scale, tf.scale]);
    }
    return m;
  }

  /** Converts m to a mat3x2 */
  static asGLMat3x2(m: mat3): number[] {
    // gl-matrix, like OpenGL, uses column-major order.
    // In OpenGL, mat3x2 has three columns and two rows.
    return [m[0], m[1], m[3], m[4], m[6], m[7]];
  }

  /** Transposes m and converts the transposed matrix to a mat2x4 */
  static transposeAsGLMat2x4(m: mat3): number[] {
    // gl-matrix, like OpenGL, uses column-major order.
    // In OpenGL, mat2x4 has two columns and four rows.
    return [m[0], m[3], m[6], 0, m[1], m[4], m[7], 0];
  }
}
