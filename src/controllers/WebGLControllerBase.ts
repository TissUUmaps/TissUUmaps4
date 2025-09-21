import { mat3 } from "gl-matrix";

import { ILayerConfigModel } from "../models/base";
import { ILayerModel } from "../models/layer";
import { Rect } from "./WebGLController";

// TODO:
// - colorbar
// - scalebar
// - picking
// - shapes
// - graphs
// - screenshot (instancing?)

export default class WebGLControllerBase {
  protected readonly _gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }

  protected static createDataToLayerTransform(
    layerConfig: ILayerConfigModel,
  ): mat3 {
    const tf = mat3.create();
    if (layerConfig.scale) {
      mat3.scale(tf, tf, [layerConfig.scale, layerConfig.scale]);
    }
    if (layerConfig.flip) {
      mat3.scale(tf, tf, [-1, 1]);
    }
    if (layerConfig.rotation) {
      mat3.rotate(tf, tf, (layerConfig.rotation * Math.PI) / 180);
    }
    if (layerConfig.translation) {
      mat3.translate(tf, tf, [
        layerConfig.translation.x,
        layerConfig.translation.y,
      ]);
    }
    return tf;
  }

  protected static createLayerToWorldTransform(layer: ILayerModel): mat3 {
    const tf = mat3.create();
    if (layer.scale) {
      mat3.scale(tf, tf, [layer.scale, layer.scale]);
    }
    if (layer.translation) {
      mat3.translate(tf, tf, [layer.translation.x, layer.translation.y]);
    }
    return tf;
  }

  protected static createWorldToViewportTransform(viewport: Rect): mat3 {
    const tf = mat3.create();
    mat3.translate(tf, tf, [-viewport.x, -viewport.y]);
    mat3.scale(tf, tf, [1.0 / viewport.width, 1.0 / viewport.height]);
    return tf;
  }
}
