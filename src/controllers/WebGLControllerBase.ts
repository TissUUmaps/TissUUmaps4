import { mat3 } from "gl-matrix";

import { Rect } from "./WebGLController";

export default class WebGLControllerBase {
  protected readonly _gl: WebGL2RenderingContext;

  constructor(gl: WebGL2RenderingContext) {
    this._gl = gl;
  }

  protected static createWorldToViewportMatrix(viewport: Rect): mat3 {
    const m = mat3.create();
    const t = mat3.fromTranslation(mat3.create(), [-viewport.x, -viewport.y]);
    mat3.multiply(m, t, m);
    const s = mat3.fromScaling(mat3.create(), [
      1.0 / viewport.width,
      1.0 / viewport.height,
    ]);
    mat3.multiply(m, s, m);
    return m;
  }
}
