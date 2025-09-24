import { mat3 } from "gl-matrix";

import { SimilarityTransform } from "../models/types";

export default class TransformUtils {
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
    rotationCenter?: { x: number; y: number },
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
}
