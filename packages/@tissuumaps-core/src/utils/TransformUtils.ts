import { mat3, vec2 } from "gl-matrix";

import { type Transform } from "../model/types";
import { type Rect } from "../types";

/**
 * Utility methods for converting between {@link Transform}
 * objects and `gl-matrix` {@link mat3} matrices
 */
export class TransformUtils {
  /**
   * Decomposes a 3×3 similarity matrix into a {@link Transform}
   *
   * Extracts flip, uniform scale, rotation (in degrees), and translation
   * from a column-major `gl-matrix` {@link mat3}. A negative 2D determinant
   * indicates a horizontal reflection.
   *
   * @param m - The source matrix
   */
  static fromSimilarityMatrix(m: mat3): Transform {
    // gl-matrix, like OpenGL, uses column-major order.
    // Detect reflection via the sign of the 2D determinant.
    const det = m[0] * m[4] - m[3] * m[1];
    const flipped = det < 0;
    const c0 = flipped ? -m[0] : m[0];
    const c1 = flipped ? -m[1] : m[1];
    return {
      flip: flipped,
      scale: Math.sqrt(c0 * c0 + c1 * c1),
      rotation: (Math.atan2(c1, c0) * 180) / Math.PI,
      translation: { x: m[6], y: m[7] },
    };
  }

  /**
   * Builds a 3×3 similarity matrix from a (partial) {@link Transform}
   *
   * Applies, in order: optional horizontal flip, scale,
   * rotation (around `center` if provided), and translation.
   *
   * @param tf - The transform components (all optional)
   * @param options - Optional rotation center in pre-scaled coordinates
   */
  static toSimilarityMatrix(
    tf: Partial<Transform>,
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
    if (tf.flip) {
      mat3.scale(m, m, [-1, 1]);
    }
    return m;
  }

  /**
   * Computes the OSD tiled-image parameters (flip, width, rotation, position)
   * for a data → layer → world transform chain.
   *
   * OSD applies rotation around the image center and flip around the image
   * center, so this method compensates for both to produce a net transform
   * equivalent to the WebGL path (rotation around origin, flip around left
   * edge).
   *
   * @param transform - Data → layer transform
   * @param layerTransform - Layer → world transform
   * @param contentSize - Pixel dimensions of the tiled image
   */
  static toTiledImageGeometry(
    transform: Transform,
    layerTransform: Transform,
    contentSize: { x: number; y: number },
  ): {
    flip: boolean;
    width: number;
    rotation: number;
    x: number;
    y: number;
  } {
    const dataCenter = {
      x: contentSize.x / 2,
      y: contentSize.y / 2,
    };
    const m = mat3.create();
    const dataToLayerMatrix = TransformUtils.toSimilarityMatrix(
      { ...transform, flip: false },
      { center: { x: -dataCenter.x, y: -dataCenter.y } },
    );
    mat3.multiply(m, dataToLayerMatrix, m);
    const layerToWorldMatrix = TransformUtils.toSimilarityMatrix(
      { ...layerTransform, flip: false },
      {
        center: {
          x: -dataCenter.x * transform.scale,
          y: -dataCenter.y * transform.scale,
        },
      },
    );
    mat3.multiply(m, layerToWorldMatrix, m);
    const composed = TransformUtils.fromSimilarityMatrix(m);
    const flip = !!transform.flip !== !!layerTransform.flip;
    const width = contentSize.x * composed.scale;
    const rotation = composed.rotation;
    let { x, y } = composed.translation;
    if (flip) {
      const rad = (rotation * Math.PI) / 180;
      x -= width * Math.cos(rad);
      y -= width * Math.sin(rad);
    }
    return { flip, width, rotation, x, y };
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
