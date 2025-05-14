import { Transform } from "../models/types";

export default class TransformUtils {
  static readonly IDENTITY: Transform = {};
  static readonly I3 = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  static chain(...tfs: Transform[]): Transform {
    let result = this.I3;
    for (const tf of tfs) {
      const m = TransformUtils.toMatrix(tf);
      result = TransformUtils.multiplyMatrices(m, result);
    }
    return TransformUtils.fromMatrix(result);
  }

  static fromMatrix(m: number[][]): Transform {
    return {
      translation: { x: m[0][2], y: m[1][2] },
      rotation: Math.atan2(m[1][0], m[1][1]) * (180 / Math.PI),
      scale: (Math.abs(m[0][0]) * m[1][1] - m[0][1] * m[1][0]) ** 0.5,
      flip: Math.sign(m[0][0]) === -1,
    } as Transform;
  }

  static toMatrix(tf: Transform): number[][] {
    const tx = tf.translation?.x ?? 0;
    const ty = tf.translation?.y ?? 0;
    const r = (tf.rotation ?? 0) * (Math.PI / 180);
    const s = tf.scale ?? 1;
    const k = tf.flip ? -1 : 1;
    return [
      [k * s * Math.cos(r), -Math.sin(r), tx],
      [Math.sin(r), s * Math.cos(r), ty],
      [0, 0, 1],
    ];
  }

  static multiplyMatrices(a: number[][], b: number[][]): number[][] {
    if (a[0].length !== b.length) {
      throw new Error("Incompatible matrix sizes");
    }
    const m = new Array(a.length);
    for (let i = 0; i < m.length; i++) {
      const m_i = new Array(b[0].length);
      for (let j = 0; j < m_i.length; j++) {
        let m_ij = 0;
        for (let k = 0; k < a[0].length; k++) {
          m_ij += a[i][k] * b[k][j];
        }
        m_i[j] = m_ij;
      }
      m[i] = m_i;
    }
    return m as number[][];
  }
}
