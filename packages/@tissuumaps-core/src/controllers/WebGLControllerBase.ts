import { mat3 } from "gl-matrix";

import { type LayerConfig } from "../model/base";
import { type Layer } from "../model/layer";
import { type Rect } from "../types";
import { TransformUtils } from "../utils/TransformUtils";

/**
 * Base class for WebGL sub-controllers
 *
 * Provides shared coordinate-transform utilities for computing matrices between
 * data space, layer space, world space, and viewport space.
 */
export class WebGLControllerBase {
  protected readonly _gl: WebGL2RenderingContext;

  /** @param gl - The WebGL 2 rendering context shared with the parent {@link WebGLController} */
  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }

  /**
   * Computes the data → world transformation matrix
   *
   * Applies, in order: optional horizontal flip, data → layer transform,
   * then layer → world transform.
   *
   * @param layer - Layer providing the layer → world transform
   * @param layerConfig - Layer configuration providing the flip flag and data → layer transform
   */
  protected static createDataToWorldMatrix(
    layer: Layer,
    layerConfig: LayerConfig,
  ): mat3 {
    const dataToWorldMatrix = mat3.create();
    if (layerConfig.flip) {
      const flipMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
      mat3.multiply(dataToWorldMatrix, flipMatrix, dataToWorldMatrix);
    }
    const dataToLayerMatrix = TransformUtils.toSimilarityMatrix(
      layerConfig.transform,
    );
    mat3.multiply(dataToWorldMatrix, dataToLayerMatrix, dataToWorldMatrix);
    const layerToWorldMatrix = TransformUtils.toSimilarityMatrix(
      layer.transform,
    );
    mat3.multiply(dataToWorldMatrix, layerToWorldMatrix, dataToWorldMatrix);
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
   * Computes the world → data transformation matrix
   *
   * Inverse of {@link createDataToWorldMatrix}: applies world → layer,
   * layer → data, then optional horizontal un-flip.
   *
   * @param layer - Layer providing the layer → world transform (inverted)
   * @param layerConfig - Layer configuration providing the data → layer transform (inverted) and flip flag
   */
  protected static createWorldToDataMatrix(
    layer: Layer,
    layerConfig: LayerConfig,
  ): mat3 {
    const worldToDataMatrix = mat3.create();
    const worldToLayerMatrix = TransformUtils.toSimilarityMatrix(
      layer.transform,
    );
    mat3.invert(worldToLayerMatrix, worldToLayerMatrix);
    mat3.multiply(worldToDataMatrix, worldToLayerMatrix, worldToDataMatrix);
    const layerToDataMatrix = TransformUtils.toSimilarityMatrix(
      layerConfig.transform,
    );
    mat3.invert(layerToDataMatrix, layerToDataMatrix);
    mat3.multiply(worldToDataMatrix, layerToDataMatrix, worldToDataMatrix);
    if (layerConfig.flip) {
      const flipMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
      mat3.multiply(worldToDataMatrix, flipMatrix, worldToDataMatrix);
    }
    return worldToDataMatrix;
  }
}
