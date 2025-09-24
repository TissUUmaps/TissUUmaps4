import { mat3 } from "gl-matrix";

import { SimilarityTransform } from "../models/types";

export default class TransformUtils {
  static fromMatrix(m: mat3): SimilarityTransform {
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
    const m = mat3.create();
    if (tf.scale !== undefined) {
      const s = mat3.fromScaling(mat3.create(), [tf.scale, tf.scale]);
      mat3.multiply(m, s, m);
    }
    if (rotationCenter !== undefined) {
      const t = mat3.fromTranslation(mat3.create(), [
        -rotationCenter.x * (tf.scale ?? 1),
        -rotationCenter.y * (tf.scale ?? 1),
      ]);
      mat3.multiply(m, t, m);
    }
    if (tf.rotation !== undefined) {
      const r = mat3.fromRotation(mat3.create(), (Math.PI * tf.rotation) / 180);
      mat3.multiply(m, r, m);
    }
    if (rotationCenter !== undefined) {
      const t = mat3.fromTranslation(mat3.create(), [
        rotationCenter.x * (tf.scale ?? 1),
        rotationCenter.y * (tf.scale ?? 1),
      ]);
      mat3.multiply(m, t, m);
    }
    if (tf.translation !== undefined) {
      const t = mat3.fromTranslation(mat3.create(), [
        tf.translation.x,
        tf.translation.y,
      ]);
      mat3.multiply(m, t, m);
    }
    return m;
  }
}
