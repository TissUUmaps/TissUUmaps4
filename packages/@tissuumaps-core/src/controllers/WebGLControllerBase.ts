import { mat3 } from "gl-matrix";

import { type LayerConfig } from "../model/base";
import { type Layer } from "../model/layer";
import { type Rect } from "../types";
import { TransformUtils } from "../utils/TransformUtils";

export class WebGLControllerBase {
  protected readonly _gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }

  protected static createDataToWorldMatrix(
    layer: Layer,
    layerConfig: LayerConfig,
  ): mat3 {
    const dataToWorldMatrix = mat3.create();
    if (layerConfig.flip) {
      const flipMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
      mat3.multiply(dataToWorldMatrix, flipMatrix, dataToWorldMatrix);
    }
    const dataToLayerMatrix = TransformUtils.toMatrix(layerConfig.transform);
    mat3.multiply(dataToWorldMatrix, dataToLayerMatrix, dataToWorldMatrix);
    const layerToWorldMatrix = TransformUtils.toMatrix(layer.transform);
    mat3.multiply(dataToWorldMatrix, layerToWorldMatrix, dataToWorldMatrix);
    return dataToWorldMatrix;
  }

  protected static createWorldToViewportMatrix(viewport: Rect): mat3 {
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    mat3.scale(m, m, [1 / viewport.width, 1 / viewport.height]);
    mat3.translate(m, m, [-viewport.x, -viewport.y]);
    return m;
  }

  protected static createViewportToWorldMatrix(viewport: Rect): mat3 {
    // gl-matrix, like OpenGL, uses pre-multiplied matrices,
    // so we need to apply transformations in reverse order.
    const m = mat3.create();
    mat3.translate(m, m, [viewport.x, viewport.y]);
    mat3.scale(m, m, [viewport.width, viewport.height]);
    return m;
  }

  protected static createWorldToDataMatrix(
    layer: Layer,
    layerConfig: LayerConfig,
  ): mat3 {
    const worldToDataMatrix = mat3.create();
    const worldToLayerMatrix = TransformUtils.toMatrix(layer.transform);
    mat3.invert(worldToLayerMatrix, worldToLayerMatrix);
    mat3.multiply(worldToDataMatrix, worldToLayerMatrix, worldToDataMatrix);
    const layerToDataMatrix = TransformUtils.toMatrix(layerConfig.transform);
    mat3.invert(layerToDataMatrix, layerToDataMatrix);
    mat3.multiply(worldToDataMatrix, layerToDataMatrix, worldToDataMatrix);
    if (layerConfig.flip) {
      const flipMatrix = mat3.fromScaling(mat3.create(), [-1, 1]);
      mat3.multiply(worldToDataMatrix, flipMatrix, worldToDataMatrix);
    }
    return worldToDataMatrix;
  }
}
