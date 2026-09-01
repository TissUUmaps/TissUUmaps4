import { mat3 } from "gl-matrix";

import {
  type Layer,
  type Rect,
  type SimilarityTransform,
  TransformUtils,
} from "@tissuumaps/core";

/**
 * Coordinate transformation helpers for the WebGL renderers
 *
 * All matrices are column-major `gl-matrix` {@link mat3} instances, converted to
 * the smaller GLSL matrix types by {@link convertMatrixToGLMat3x2} and
 * {@link transposeAndConvertMatrixToGLMat2x4} before being passed to a shader.
 */
export class WebGLUtils {
  /**
   * Computes the data → world transformation matrix
   *
   * Applies, in order: optional horizontal flip, data → layer transform,
   * then layer → world transform.
   *
   * @param obj - Object providing the flip flag and data → layer transform
   * @param layer - Layer providing the layer → world transform
   */
  static createDataToWorldMatrix(
    obj: { flip: boolean; transform: SimilarityTransform },
    layer: Layer,
  ): mat3 {
    const dataToWorldMatrix = mat3.create();
    if (obj.flip) {
      const flipMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
      mat3.multiply(dataToWorldMatrix, flipMatrix, dataToWorldMatrix);
    }
    const dataToLayerMatrix = TransformUtils.toSimilarityMatrix(obj.transform);
    mat3.multiply(dataToWorldMatrix, dataToLayerMatrix, dataToWorldMatrix);
    const layerToWorldMatrix = TransformUtils.toSimilarityMatrix(
      layer.transform,
    );
    mat3.multiply(dataToWorldMatrix, layerToWorldMatrix, dataToWorldMatrix);
    return dataToWorldMatrix;
  }

  /**
   * Computes the world → data transformation matrix
   *
   * Inverse of {@link createDataToWorldMatrix}: applies world → layer,
   * layer → data, then optional horizontal un-flip.
   *
   * @param obj - Object providing the data → layer transform (inverted) and flip flag
   * @param layer - Layer providing the layer → world transform (inverted)
   */
  static createWorldToDataMatrix(
    obj: { flip: boolean; transform: SimilarityTransform },
    layer: Layer,
  ): mat3 {
    const worldToDataMatrix = mat3.create();
    const worldToLayerMatrix = TransformUtils.toSimilarityMatrix(
      layer.transform,
    );
    mat3.invert(worldToLayerMatrix, worldToLayerMatrix);
    mat3.multiply(worldToDataMatrix, worldToLayerMatrix, worldToDataMatrix);
    const layerToDataMatrix = TransformUtils.toSimilarityMatrix(obj.transform);
    mat3.invert(layerToDataMatrix, layerToDataMatrix);
    mat3.multiply(worldToDataMatrix, layerToDataMatrix, worldToDataMatrix);
    if (obj.flip) {
      const flipMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
      mat3.multiply(worldToDataMatrix, flipMatrix, worldToDataMatrix);
    }
    return worldToDataMatrix;
  }

  /**
   * Computes the world → viewport transformation matrix
   *
   * Translates by the negative viewport origin and scales by the inverse
   * viewport dimensions, mapping world coordinates to the `[0, 1]` range.
   *
   * @param viewport - World-space viewport rectangle
   */
  static createWorldToViewportMatrix(viewport: Rect): mat3 {
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    mat3.scale(m, m, [1 / viewport.width, 1 / viewport.height]);
    mat3.translate(m, m, [-viewport.x, -viewport.y]);
    return m;
  }

  /**
   * Computes the viewport → world transformation matrix
   *
   * Inverse of {@link createWorldToViewportMatrix}.
   *
   * @param viewport - World-space viewport rectangle
   */
  static createViewportToWorldMatrix(viewport: Rect): mat3 {
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    mat3.translate(m, m, [viewport.x, viewport.y]);
    mat3.scale(m, m, [viewport.width, viewport.height]);
    return m;
  }

  /**
   * Extracts a column-major `mat3x2` (3 columns × 2 rows) from a {@link mat3},
   * discarding the third row
   *
   * @param m - The source matrix
   */
  static convertMatrixToGLMat3x2(m: mat3): number[] {
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
  static transposeAndConvertMatrixToGLMat2x4(m: mat3): number[] {
    // gl-matrix, like OpenGL, uses column-major order.
    // In OpenGL, mat2x4 has two columns and four rows.
    return [m[0], m[3], m[6], 0, m[1], m[4], m[7], 0];
  }
}
