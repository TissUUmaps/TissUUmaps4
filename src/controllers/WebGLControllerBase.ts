import { mat3 } from "gl-matrix";

import { ILayerConfigModel } from "../models/base";
import { ILayerModel } from "../models/layer";
import { Rect } from "./WebGLController";

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
      const scale = mat3.fromScaling(mat3.create(), [
        layerConfig.scale,
        layerConfig.scale,
      ]);
      mat3.multiply(tf, scale, tf);
    }
    if (layerConfig.flip) {
      const flip = mat3.fromScaling(mat3.create(), [-1, 1]);
      mat3.multiply(tf, flip, tf);
    }
    if (layerConfig.rotation) {
      const rotation = mat3.fromRotation(
        mat3.create(),
        (layerConfig.rotation * Math.PI) / 180,
      );
      mat3.multiply(tf, rotation, tf);
    }
    if (layerConfig.translation) {
      const translation = mat3.fromTranslation(mat3.create(), [
        layerConfig.translation.x,
        layerConfig.translation.y,
      ]);
      mat3.multiply(tf, translation, tf);
    }
    return tf;
  }

  protected static createLayerToWorldTransform(layer: ILayerModel): mat3 {
    const tf = mat3.create();
    if (layer.scale) {
      const scale = mat3.fromScaling(mat3.create(), [layer.scale, layer.scale]);
      mat3.multiply(tf, scale, tf);
    }
    if (layer.translation) {
      const translation = mat3.fromTranslation(mat3.create(), [
        layer.translation.x,
        layer.translation.y,
      ]);
      mat3.multiply(tf, translation, tf);
    }
    return tf;
  }

  protected static createWorldToViewportTransform(viewport: Rect): mat3 {
    const tf = mat3.create();
    const translation = mat3.fromTranslation(mat3.create(), [
      -viewport.x,
      -viewport.y,
    ]);
    mat3.multiply(tf, translation, tf);
    const scale = mat3.fromScaling(mat3.create(), [
      1.0 / viewport.width,
      1.0 / viewport.height,
    ]);
    mat3.multiply(tf, scale, tf);
    return tf;
  }
}
