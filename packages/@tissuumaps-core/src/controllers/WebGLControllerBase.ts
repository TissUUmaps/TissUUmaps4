import { mat3 } from "gl-matrix";

import { type Layer } from "../model/layer";
import { type SimilarityTransform } from "../model/types";
import { type Rect } from "../types";
import { TransformUtils } from "../utils/TransformUtils";

/**
 * Base class for WebGL sub-controllers
 *
 * Provides shared coordinate-transform utilities for computing matrices between
 * data space, layer space, world space, and viewport space.
 */
export class WebGLControllerBase {
  public readonly gl: WebGL2RenderingContext;

  /** @param gl - The WebGL 2 rendering context shared with the parent {@link WebGLController} */
  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl;
  }

  /**
   * Composes data → layer and layer → world similarity matrices
   *
   * Flip is encoded in each matrix (negative determinant) so that a layer
   * flip mirrors the entire coordinate system — all objects move to
   * mirrored positions as a group.
   *
   * @param transform - The data → layer transform
   * @param layer - Layer providing the layer → world transform
   */
  protected static createDataToWorldMatrix(
    transform: SimilarityTransform,
    layer: Layer,
  ): mat3 {
    const dataToLayerMatrix = TransformUtils.toSimilarityMatrix(transform);
    const layerToWorldMatrix = TransformUtils.toSimilarityMatrix(
      layer.transform,
    );
    const dataToWorldMatrix = mat3.create();
    mat3.multiply(dataToWorldMatrix, layerToWorldMatrix, dataToLayerMatrix);
    return dataToWorldMatrix;
  }

  /**
   * Computes the world → viewport transformation matrix
   *
   * Translates by the negative viewport origin and scales by the inverse
   * viewport dimensions, mapping world coordinates to the `[0, 1]` range.
   *
   * @param viewport - World-space viewport rectangle
   */
  protected static createWorldToViewportMatrix(viewport: Rect): mat3 {
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
  protected static createViewportToWorldMatrix(viewport: Rect): mat3 {
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    mat3.translate(m, m, [viewport.x, viewport.y]);
    mat3.scale(m, m, [viewport.width, viewport.height]);
    return m;
  }

  /**
   * Inverse of {@link createDataToWorldMatrix}
   *
   * @param transform - The data → layer transform (inverted)
   * @param layer - Layer providing the layer → world transform (inverted)
   */
  protected static createWorldToDataMatrix(
    transform: SimilarityTransform,
    layer: Layer,
  ): mat3 {
    const worldToDataMatrix = mat3.create();
    const worldToLayerMatrix = TransformUtils.toSimilarityMatrix(
      layer.transform,
    );
    mat3.invert(worldToLayerMatrix, worldToLayerMatrix);
    const layerToDataMatrix = TransformUtils.toSimilarityMatrix(transform);
    mat3.invert(layerToDataMatrix, layerToDataMatrix);
    mat3.multiply(worldToDataMatrix, layerToDataMatrix, worldToLayerMatrix);
    return worldToDataMatrix;
  }
}
