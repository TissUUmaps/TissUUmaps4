import { Transform } from "../models/types";

export default class TransformUtils {
  private static readonly I3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  static chain(...tfs: Transform[]): Transform {
    let m2 = this.I3;
    for (const tf of tfs) {
      const m1 = TransformUtils.toMatrix(tf);
      m2 = TransformUtils.multiply(m1, m2);
    }
    return TransformUtils.fromMatrix(m2);
  }

  private static fromMatrix(m: number[][]): Transform {
    return {
      scale: TransformUtils.getScale(m),
      rotation: TransformUtils.getRotation(m),
      translation: TransformUtils.getTranslation(m),
    };
  }

  private static toMatrix(tf: Transform): number[][] {
    const m = this.I3;
    if (tf.rotation !== undefined) {
      const c = Math.cos(tf.rotation * (Math.PI / 180));
      const s = Math.sin(tf.rotation * (Math.PI / 180));
      m[0][0] *= c;
      m[0][1] *= -s;
      m[1][0] *= s;
      m[1][1] *= c;
    }
    if (tf.scale !== undefined) {
      m[0][0] *= tf.scale;
      m[1][1] *= tf.scale;
    }
    if (tf.translation !== undefined) {
      m[0][2] += tf.translation.x;
      m[1][2] += tf.translation.y;
    }
    return m;
  }

  private static getScale(m: number[][]): number {
    const [[a, b, c], [d, e, f], [g, h, i]] = m;
    const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g);
    return det ** 0.5; // det = scale ** ndim --> scale = det ** (1 / ndim)
  }

  private static getRotation(m: number[][]): number {
    return Math.atan2(m[1][0], m[1][1]) * (180 / Math.PI);
  }

  private static getTranslation(m: number[][]): { x: number; y: number } {
    return { x: m[0][2], y: m[1][2] };
  }

  private static multiply(m1: number[][], m2: number[][]): number[][] {
    const m = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        for (let k = 0; k < 3; k++) {
          m[i][j] += m1[i][k] * m2[k][j];
        }
      }
    }
    return m;
  }
}
